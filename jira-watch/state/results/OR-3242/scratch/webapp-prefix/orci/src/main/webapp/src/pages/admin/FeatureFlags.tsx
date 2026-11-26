import { useCallback, useState } from "react";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import { AdminTable } from "../../components/Admin/AdminTable";
import { PaginatedView } from "../../components/Admin/PaginatedView";
import {
  Button,
  Form,
  Modal,
  OverlayTrigger,
  Tab,
  Tabs,
  Tooltip,
} from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { Paginated } from "../../types/Paginated";
import {
  keepPreviousData,
  skipToken,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ErrorMessage, Field, Formik, FormikErrors } from "formik";
import { DatePickerField } from "../../components/Form/DatePickerField";
import { MultiTenantPickerFormikField } from "../../components/Admin/TenantPicker";
import { UserPickerFormikField } from "../../components/Admin/UserPicker";
import { grammaticalList, pluralizeWithNumber } from "../../utils/stringUtils";
import { InfoCircle, Plus } from "react-bootstrap-icons";
import { BootstrapField } from "../../components/Form/BootstrapField";
import { sanitizedHtml } from "../../utils/markup";
import { marked } from "marked";
import { FEATURE_FLAG_NOTES_QUERY_KEY } from "../../components/FeatureFlagNoteViewer";
import {
  FeatureFlagAdminController,
  UserAdminController,
} from "../../api/generated/sdk.gen";
import type {
  FeatureFlagDto,
  PagedModelFeatureFlagDto,
} from "../../api/generated/types.gen";
import { useDebounce } from "use-debounce";

type FeatureFlagStrategyId = NonNullable<FeatureFlagDto["strategyId"]>;

const RULE_FEATURE_FLAG_PREFIX = "RULE:";
const FEATURE_FLAGS_QUERY_KEY = ["admin", "feature-flags"];

// Adapter to convert PagedModelFeatureFlagDto to Paginated<FeatureFlagDto>
function toPagedResult(
  response: PagedModelFeatureFlagDto,
): Paginated<FeatureFlagDto> {
  return {
    content: response.content ?? [],
    page: {
      size: response.page?.size ?? 0,
      totalElements: response.page?.totalElements ?? 0,
      totalPages: response.page?.totalPages ?? 0,
      number: response.page?.number ?? 0,
    },
  };
}

async function fetchFeatureFlags(
  page: number,
  size: number,
  search?: string,
): Promise<Paginated<FeatureFlagDto>> {
  const { data } = await FeatureFlagAdminController.getFeatureFlags({
    query: {
      page,
      size,
      ...(search ? { search } : {}),
    } as { page: number; size: number; search?: string },
  });
  return toPagedResult(data!);
}

async function fetchFeatureFlag(id: string): Promise<FeatureFlagDto> {
  const { data } = await FeatureFlagAdminController.getFeatureFlag({
    path: { id },
  });
  return data!;
}

type FeatureFlagNote = {
  noteText: string;
  bannerText: string;
};

const isSuccessOrNotFound = (status: number) =>
  (status >= 200 && status < 300) || status === 404;

async function fetchFeatureFlagNote(
  id: string,
): Promise<FeatureFlagNote | null> {
  try {
    const { data, status } =
      await FeatureFlagAdminController.getFeatureFlagNote({
        path: { id },
        validateStatus: isSuccessOrNotFound,
      });
    if (status === 404 || !data) return null;
    return {
      noteText: data.noteText ?? "",
      bannerText: data.bannerText ?? "",
    };
  } catch {
    return null;
  }
}

function FeatureFlagsBody({
  selectedFlagId,
  onSelect,
  onClose,
}: {
  selectedFlagId: string | undefined;
  onSelect: (flagId: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);

  return (
    <>
      <AdminPageHeader
        title="Feature Flags"
        meta="Which rules and features each tenant or user can see, and when they go live."
      />
      {selectedFlagId && (
        <FeatureFlagEditor featureFlagId={selectedFlagId} onClose={onClose} />
      )}
      <div className="admin-toolbar">
        <Form.Control
          type="search"
          className="admin-toolbar__search"
          placeholder="Search by name"
          aria-label="Search feature flags"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <PaginatedView<FeatureFlagDto>
        searchable={false}
        queryFn={(page, size) => fetchFeatureFlags(page, size, debouncedSearch)}
        queryKey={[...FEATURE_FLAGS_QUERY_KEY, "list", debouncedSearch]}
      >
        {({ items }) => (
          <AdminTable className="admin-table--selectable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="admin-table__empty">
                    {debouncedSearch.trim()
                      ? "No feature flags match this search."
                      : "No feature flags yet."}
                  </td>
                </tr>
              )}
              {items.map((featureFlag) => (
                <tr
                  key={featureFlag.name}
                  onClick={() => onSelect(featureFlag.name!)}
                >
                  <td>
                    <strong>{featureFlag.name}</strong>
                  </td>
                  <td className="text-wrap">{featureFlag.description}</td>
                  <td>{describeFlagStatus(featureFlag)}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </PaginatedView>
    </>
  );
}

export function FeatureFlagsContent() {
  const [selectedFlagId, setSelectedFlagId] = useState<string>();
  return (
    <FeatureFlagsBody
      selectedFlagId={selectedFlagId}
      onSelect={setSelectedFlagId}
      onClose={() => setSelectedFlagId(undefined)}
    />
  );
}

export function FeatureFlags() {
  const { featureFlagId } = useParams();
  const navigate = useNavigate();
  return (
    <AdminPage>
      <FeatureFlagsBody
        selectedFlagId={featureFlagId}
        onSelect={(flagId) => navigate(`/admin/feature-flags/${flagId}`)}
        onClose={() => navigate("/admin/feature-flags/")}
      />
    </AdminPage>
  );
}

type PerTenantStrategyParams = {
  enabledTenants: string[];
  enableDate: string;
};

type UserListStrategyParams = {
  userIds: string[];
  enableDate: string;
};

type EnabledForAllTenantsExceptStrategyParams = {
  disabledTenants: string[];
  enableDate: string;
};

type FormState = {
  name: string;
  description: string;
  enabled: boolean;
  publishDate: string | null;
  note: FeatureFlagNote | null;
  strategy: {
    userListStrategy?: {
      users: User[];
    };
    perTenantStrategy?: {
      enabledTenants: { value: string; label: string }[];
    };
    enabledForAllTenantsExceptStrategy?: {
      disabledTenants: { value: string; label: string }[];
    };
  };
  strategyId: FeatureFlagStrategyId;
};

type User = { id: string; username: string };

async function hydrateUserIds(userIds: string[]): Promise<User[]> {
  return Promise.all(
    userIds.map(async (userId) => {
      const { data } = await UserAdminController.getUser({
        path: { id: userId },
      });
      return { id: data!.id!, username: data!.username! };
    }),
  );
}

async function hydrateFeatureFlagData(
  data: FeatureFlagDto,
): Promise<FormState> {
  const strategyParams = data.strategyParams
    ? JSON.parse(data.strategyParams)
    : {};

  let strategy: FormState["strategy"] = {};
  if (data.strategyId === "USER_LIST") {
    const params = strategyParams as UserListStrategyParams;
    strategy = {
      userListStrategy: {
        users: await hydrateUserIds(params?.userIds || []),
      },
    };
  } else if (data.strategyId === "PER_TENANT") {
    const params = strategyParams as PerTenantStrategyParams;
    strategy = {
      perTenantStrategy: {
        enabledTenants:
          params?.enabledTenants?.map((tenant) => ({
            value: tenant,
            label: tenant,
          })) || [],
      },
    };
  } else if (data.strategyId === "ENABLED_FOR_ALL_TENANTS_EXCEPT") {
    const params = strategyParams as EnabledForAllTenantsExceptStrategyParams;
    strategy = {
      enabledForAllTenantsExceptStrategy: {
        disabledTenants:
          params?.disabledTenants?.map((tenant) => ({
            value: tenant,
            label: tenant,
          })) || [],
      },
    };
  }

  return {
    name: data.name!,
    strategyId: data.strategyId!,
    description: data.description!,
    enabled: data.enabled!,
    publishDate: strategyParams?.enableDate ?? null,
    note: await fetchFeatureFlagNote(data.name!),
    strategy,
  };
}

function FieldHelp({ text }: { text: string }) {
  return (
    <OverlayTrigger overlay={<Tooltip>{text}</Tooltip>}>
      <InfoCircle className="ms-1" aria-label={text} />
    </OverlayTrigger>
  );
}

function FeatureFlagEditor({
  featureFlagId,
  onClose,
}: {
  featureFlagId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [resultMessage, setResultMessage] = useState<undefined | "ok" | "err">(
    undefined,
  );

  const selectedFeatureFlagQ = useQuery({
    queryKey: [...FEATURE_FLAGS_QUERY_KEY, "detail", featureFlagId],
    queryFn: !!featureFlagId
      ? async () =>
          hydrateFeatureFlagData(await fetchFeatureFlag(featureFlagId))
      : skipToken,
    placeholderData: keepPreviousData,
  });

  const resetViewTracking = useCallback(
    async (flagId: string) => {
      await FeatureFlagAdminController.resetFeatureFlagNoteViewState({
        path: { id: flagId },
      });
      await queryClient.invalidateQueries({
        queryKey: FEATURE_FLAG_NOTES_QUERY_KEY,
      });
    },
    [queryClient],
  );

  const isLoading =
    selectedFeatureFlagQ.isFetching && !selectedFeatureFlagQ.isPaused;

  if (!selectedFeatureFlagQ.data) {
    return <div />;
  }

  return (
    <div className={isLoading ? "admin-busy" : undefined}>
      <Formik
        initialValues={selectedFeatureFlagQ.data}
        enableReinitialize={true}
        validate={(values) => {
          const errors: FormikErrors<typeof values> = {};
          if (!values.strategyId || (values.strategyId as any) === "-") {
            errors.strategyId = "invalid";
          }
          if (
            !values.publishDate ||
            isNaN(new Date(values.publishDate).getTime())
          ) {
            errors.publishDate = "invalid";
          }
          return errors;
        }}
        onSubmit={async (values) => {
          let paramsPayload = {};
          if (values.strategyId === "USER_LIST") {
            paramsPayload = {
              userIds: values.strategy.userListStrategy?.users.map(
                (user: any) => user.id,
              ),
              enableDate: values.publishDate,
            };
          } else if (values.strategyId === "PER_TENANT") {
            paramsPayload = {
              enabledTenants:
                values.strategy.perTenantStrategy?.enabledTenants.map(
                  (tenant: any) => tenant.value,
                ),
              enableDate: values.publishDate,
            };
          } else if (values.strategyId === "ENABLED_FOR_ALL") {
            paramsPayload = {
              enableDate: values.publishDate,
            };
          } else if (values.strategyId === "ENABLED_FOR_ALL_TENANTS_EXCEPT") {
            paramsPayload = {
              disabledTenants:
                values.strategy.enabledForAllTenantsExceptStrategy?.disabledTenants?.map(
                  (tenant: any) => tenant.value,
                ) || [],
              enableDate: values.publishDate,
            };
          }

          try {
            await FeatureFlagAdminController.updateFeatureFlag({
              body: {
                name: featureFlagId,
                description: values.description,
                enabled: values.enabled,
                strategyParams: JSON.stringify(paramsPayload),
                strategyId: values.strategyId,
              },
            });
          } catch (e) {
            setResultMessage("err");
            console.error("failed to publish feature flag", e);
            setTimeout(() => setResultMessage(undefined), 3000);
            return;
          }

          if (values.note) {
            try {
              await FeatureFlagAdminController.createOrUpdateFeatureFlagNote({
                path: { id: featureFlagId },
                body: {
                  noteText: values.note.noteText,
                  bannerText: values.note.bannerText,
                },
              });
            } catch (e) {}
          } else {
            try {
              await FeatureFlagAdminController.deleteFeatureFlagNote({
                path: { id: featureFlagId },
                validateStatus: isSuccessOrNotFound,
              });
            } catch (e) {}
          }
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: FEATURE_FLAGS_QUERY_KEY,
            }),
            queryClient.invalidateQueries({
              queryKey: FEATURE_FLAG_NOTES_QUERY_KEY,
            }),
          ]);
          setResultMessage("ok");
          setTimeout(() => setResultMessage(undefined), 3000);
        }}
      >
        {({ isSubmitting, submitForm, values, setFieldValue }) => (
          <Modal show={!!featureFlagId} onHide={onClose} keyboard={false}>
            <Modal.Header closeButton>
              <Modal.Title className="text-break">
                {selectedFeatureFlagQ.data?.name}
                <span className="admin-table__secondary">
                  {selectedFeatureFlagQ.data?.description}
                </span>
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Form.Group className="mb-3" controlId="strategy">
                  <Form.Label>Strategy</Form.Label>
                  <Field as="select" name="strategyId" className="form-select">
                    <option>-</option>
                    <option value="PER_TENANT">By Tenant</option>
                    {!featureFlagId.startsWith(RULE_FEATURE_FLAG_PREFIX) && (
                      <option value="USER_LIST">By User</option>
                    )}
                    <option value="ENABLED_FOR_ALL">Enabled for All</option>
                    <option value="ENABLED_FOR_ALL_TENANTS_EXCEPT">
                      Enabled for All Except
                    </option>
                  </Field>
                  <ErrorMessage
                    name="strategyId"
                    component="div"
                    className="text-danger"
                  />
                </Form.Group>
                {values.strategyId === "PER_TENANT" ? (
                  <Form.Group className="mb-3">
                    <Form.Label>Choose tenants to enable</Form.Label>
                    <MultiTenantPickerFormikField name="strategy.perTenantStrategy.enabledTenants" />
                  </Form.Group>
                ) : values.strategyId === "USER_LIST" ? (
                  <Form.Group className="mb-3">
                    <Form.Label>Enter names of users to enable</Form.Label>
                    <UserPickerFormikField name="strategy.userListStrategy.users" />
                  </Form.Group>
                ) : values.strategyId === "ENABLED_FOR_ALL" ? (
                  <p className="admin-section__lede">
                    The flag will be enabled for all users.
                  </p>
                ) : values.strategyId === "ENABLED_FOR_ALL_TENANTS_EXCEPT" ? (
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Choose tenants to disable (enabled for all others)
                    </Form.Label>
                    <MultiTenantPickerFormikField name="strategy.enabledForAllTenantsExceptStrategy.disabledTenants" />
                  </Form.Group>
                ) : null}

                <Form.Group className="mb-3" controlId="publishDate">
                  <Form.Label>
                    Go-live date
                    <FieldHelp text="This feature will be disabled before the go-live date. Afterwards, other criteria will apply according to the strategy." />
                  </Form.Label>
                  <DatePickerField
                    name="publishDate"
                    className="form-control"
                  />
                  <ErrorMessage
                    name="publishDate"
                    component="div"
                    className="text-danger"
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="enabled">
                  <Form.Check
                    type="checkbox"
                    checked={values.enabled}
                    onChange={(e) => setFieldValue("enabled", e.target.checked)}
                    label={
                      <>
                        Enabled
                        <FieldHelp text="Only enabled features are eligible to be shown, subject to criteria determined by their strategy." />
                      </>
                    }
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="note">
                  <Form.Label>
                    User-facing note
                    <FieldHelp text="If a note is included, users eligible for this feature will see a banner the next time they launch the app. Clicking the banner will display this and any other unseen notes. (Optional)" />
                  </Form.Label>
                  {values.note ? (
                    <div className="admin-detail mb-0">
                      <Form.Group className="mb-3" controlId="note.bannerText">
                        <Form.Label>Banner text</Form.Label>
                        <BootstrapField
                          name="note.bannerText"
                          placeholder="banner text"
                        />
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="text">
                        <Form.Label>Note content</Form.Label>
                        <Tabs
                          defaultActiveKey="text"
                          className="admin-tabs mb-3"
                        >
                          <Tab eventKey="text" title="Text">
                            <BootstrapField
                              name="note.noteText"
                              as="textarea"
                              rows={4}
                              placeholder="Note body (markdown supported)"
                            />
                          </Tab>
                          <Tab eventKey="preview" title="Preview">
                            <div
                              className="admin-preview markdown-content-container"
                              dangerouslySetInnerHTML={
                                values &&
                                sanitizedHtml(
                                  marked.parse(values.note.noteText, {
                                    async: false,
                                  }),
                                )
                              }
                            ></div>
                          </Tab>
                        </Tabs>
                      </Form.Group>
                      <div className="admin-table__actions">
                        <OverlayTrigger
                          overlay={
                            <Tooltip>
                              Removes the note from this feature flag. Users
                              will no longer see a note on first app launch.
                            </Tooltip>
                          }
                        >
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => setFieldValue("note", null)}
                          >
                            Delete note
                          </Button>
                        </OverlayTrigger>
                        <OverlayTrigger
                          overlay={
                            <Tooltip>
                              Users who have already seen this note will see it
                              again the next time they launch the app.
                            </Tooltip>
                          }
                        >
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() =>
                              resetViewTracking(selectedFeatureFlagQ.data?.name)
                            }
                          >
                            Reset view tracking
                          </Button>
                        </OverlayTrigger>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() =>
                          setFieldValue("note", {
                            noteText: "",
                            bannerText: "",
                          })
                        }
                      >
                        <Plus aria-hidden="true" /> Add note
                      </Button>
                    </div>
                  )}
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              {resultMessage && (
                <p
                  className={
                    resultMessage === "ok"
                      ? "me-auto mb-0 text-success"
                      : "me-auto mb-0 text-danger"
                  }
                >
                  {resultMessage === "ok" ? "Published" : "Publish failed"}
                </p>
              )}
              <Button
                variant="primary"
                type="submit"
                onClick={() => submitForm()}
                disabled={isSubmitting}
              >
                Publish
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        )}
      </Formik>
    </div>
  );
}

function describeFlagStatus(flag: FeatureFlagDto): string {
  if (!flag.enabled) return "disabled";
  if (!flag.strategyParams) return "unknown";

  if (flag.strategyId === "USER_LIST") {
    const parse = JSON.parse(flag.strategyParams);
    const enabledUsers = parse?.userIds?.length || 0;
    if (enabledUsers === 0) {
      return "disabled";
    }
    const publishDate = parse?.enableDate;
    if (new Date() > new Date(publishDate)) {
      return `enabled for ${pluralizeWithNumber(enabledUsers, "user")}`;
    } else {
      return `disabled until ${new Date(publishDate).toDateString()}`;
    }
  }
  if (flag.strategyId === "PER_TENANT") {
    const parse = JSON.parse(flag.strategyParams);
    const publishDate = parse?.enableDate;
    const tenants = parse?.enabledTenants;
    if (!tenants || tenants.length === 0) {
      return "disabled";
    }
    if (new Date() > new Date(publishDate)) {
      return `enabled for ${grammaticalList(tenants)}`;
    } else {
      return `disabled until ${new Date(publishDate).toDateString()}`;
    }
  }
  if (flag.strategyId === "ENABLED_FOR_ALL") {
    const parse = JSON.parse(flag.strategyParams);
    const publishDate = parse?.enableDate;
    if (!publishDate) {
      return "disabled: missing publish date";
    }

    if (new Date() > new Date(publishDate)) {
      return `enabled for all`;
    } else {
      return `disabled until ${new Date(publishDate).toDateString()}`;
    }
  }
  if (flag.strategyId === "ENABLED_FOR_ALL_TENANTS_EXCEPT") {
    const parse = JSON.parse(flag.strategyParams);
    const publishDate = parse?.enableDate;
    const disabledTenants = parse?.disabledTenants || [];
    if (!publishDate) {
      return "disabled: missing publish date";
    }

    if (new Date() > new Date(publishDate)) {
      if (disabledTenants.length === 0) {
        return `enabled for all`;
      }
      return `enabled for all except ${grammaticalList(disabledTenants)}`;
    } else {
      return `disabled until ${new Date(publishDate).toDateString()}`;
    }
  }
  return "unknown";
}
