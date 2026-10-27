import React, { useCallback, useEffect, useState } from "react";
import { PaginatedView } from "../../components/Admin/PaginatedView";
import {
  Button,
  Col,
  Container,
  Form,
  Modal,
  OverlayTrigger,
  Stack,
  Tab,
  Table,
  Tabs,
  Tooltip,
} from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { Paginated } from "../../types/Paginated";
import { keepPreviousData, skipToken, useQuery } from "@tanstack/react-query";
import { ErrorMessage, Field, Formik, FormikErrors } from "formik";
import { DatePickerField } from "../../components/Form/DatePickerField";
import { MultiTenantPickerFormikField } from "../../components/Admin/TenantPicker";
import { UserPickerFormikField } from "../../components/Admin/UserPicker";
import { grammaticalList, pluralizeWithNumber } from "../../utils/stringUtils";
import Header from "../../components/Header";
import { InfoCircle, Plus } from "react-bootstrap-icons";
import { BootstrapField } from "../../components/Form/BootstrapField";
import { sanitizedHtml } from "../../utils/markup";
import { marked } from "marked";
import {
  FeatureFlagAdminController,
  UserAdminController,
} from "../../api/generated/sdk.gen";
import type {
  FeatureFlagDto,
  FeatureFlagNoteDto,
  PagedModelFeatureFlagDto,
} from "../../api/generated/types.gen";
import { useDebounce } from "use-debounce";

type FeatureFlagStrategyId = NonNullable<FeatureFlagDto["strategyId"]>;

const RULE_FEATURE_FLAG_PREFIX = "RULE:";

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

async function fetchFeatureFlagNote(
  id: string,
): Promise<FeatureFlagNote | null> {
  try {
    const { data } = await FeatureFlagAdminController.getFeatureFlagNote({
      path: { id },
    });
    if (!data) return null;
    return {
      noteText: data.noteText ?? "",
      bannerText: data.bannerText ?? "",
    };
  } catch {
    return null;
  }
}

export function FeatureFlagsContent() {
  const [selectedFlagId, setSelectedFlagId] = useState<string | undefined>();
  const [cacheKey, setCacheKey] = useState(String(new Date()));
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);

  return (
    <>
      {selectedFlagId && (
        <FeatureFlagEditor
          featureFlagId={selectedFlagId}
          onClose={() => {
            setSelectedFlagId(undefined);
            setCacheKey(String(new Date()));
          }}
        />
      )}
      <div className="mt-3 mb-2">
        <Form.Group controlId="search" className="d-flex align-items-center">
          <Form.Label className="me-2 mb-0">Filter:</Form.Label>
          <Form.Control
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            style={{ width: "300px" }}
          />
        </Form.Group>
      </div>
      <PaginatedView<FeatureFlagDto>
        searchable={false}
        queryFn={(page, size) => fetchFeatureFlags(page, size, debouncedSearch)}
        queryKey={["feature-flags", cacheKey, debouncedSearch]}
      >
        {({ items }) => {
          return items.length == 0 ? (
            "no feature flags"
          ) : (
            <Table striped bordered hover className="mt-3">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((featureFlag) => (
                  <tr key={featureFlag.name}>
                    <td
                      className="pointer"
                      onClick={() => setSelectedFlagId(featureFlag.name!)}
                    >
                      {featureFlag.name}
                    </td>
                    <td
                      className="pointer text-wrap"
                      onClick={() => setSelectedFlagId(featureFlag.name!)}
                    >
                      {featureFlag.description}
                    </td>
                    <td
                      className="pointer"
                      onClick={() => setSelectedFlagId(featureFlag.name!)}
                    >
                      {describeFlagStatus(featureFlag)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          );
        }}
      </PaginatedView>
    </>
  );
}

export function FeatureFlags() {
  const { featureFlagId } = useParams();
  const navigate = useNavigate();
  const [cacheKey, setCacheKey] = useState(String(new Date()));
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);

  const editFeatureFlag = useCallback(
    (targetId: string) => {
      navigate(`/admin/feature-flags/${targetId}`);
    },
    [navigate],
  );

  return (
    <Container fluid="md">
      <Header />
      <main role="main">
        {featureFlagId && (
          <FeatureFlagEditor
            featureFlagId={featureFlagId}
            onClose={() => {
              navigate("/admin/feature-flags/");
              setCacheKey(String(new Date()));
            }}
          />
        )}
        <div className="mt-3 mb-2">
          <Form.Group controlId="search" className="d-flex align-items-center">
            <Form.Label className="me-2 mb-0">Filter:</Form.Label>
            <Form.Control
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              style={{ width: "300px" }}
            />
          </Form.Group>
        </div>
        <PaginatedView<FeatureFlagDto>
          searchable={false}
          queryFn={(page, size) =>
            fetchFeatureFlags(page, size, debouncedSearch)
          }
          queryKey={["feature-flags", cacheKey, debouncedSearch]}
        >
          {({ items }) => {
            return items.length == 0 ? (
              "no feature flags"
            ) : (
              <Table striped bordered hover className="mt-3">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((featureFlag) => (
                    <tr key={featureFlag.name}>
                      <td
                        className="pointer"
                        onClick={() => editFeatureFlag(featureFlag.name!)}
                      >
                        {featureFlag.name}
                      </td>
                      <td
                        className="pointer text-wrap"
                        onClick={() => editFeatureFlag(featureFlag.name!)}
                      >
                        {featureFlag.description}
                      </td>
                      <td
                        className="pointer"
                        onClick={() => editFeatureFlag(featureFlag.name!)}
                      >
                        {describeFlagStatus(featureFlag)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            );
          }}
        </PaginatedView>
      </main>
    </Container>
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

type EnabledForAllStrategyParams = {
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

function FeatureFlagEditor({
  featureFlagId,
  onClose,
}: {
  featureFlagId: string;
  onClose: () => void;
}) {
  const [resultMessage, setResultMessage] = useState<undefined | "ok" | "err">(
    undefined,
  );

  const selectedFeatureFlagQ = useQuery({
    queryKey: ["feature-flag", featureFlagId],
    queryFn: !!featureFlagId
      ? async () =>
          hydrateFeatureFlagData(await fetchFeatureFlag(featureFlagId))
      : skipToken,
    placeholderData: keepPreviousData,
  });

  const resetViewTracking = useCallback(async (flagId: string) => {
    await FeatureFlagAdminController.resetFeatureFlagNoteViewState({
      path: { id: flagId },
    });
  }, []);

  const isLoading =
    selectedFeatureFlagQ.isFetching && !selectedFeatureFlagQ.isPaused;

  if (!selectedFeatureFlagQ.data) {
    return <div />;
  }

  return (
    <div
      style={{
        pointerEvents: isLoading ? "none" : "inherit",
      }}
    >
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
        onSubmit={async (values, formikHelpers) => {
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
              });
            } catch (e) {}
          }
          setResultMessage("ok");
          setTimeout(() => setResultMessage(undefined), 3000);
        }}
      >
        {({ isSubmitting, submitForm, values, setFieldValue }) => (
          <Modal show={!!featureFlagId} onHide={onClose} keyboard={false}>
            <Modal.Header closeButton>
              <Modal.Title>Edit Feature Flag</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Container fluid="md">
                <Form>
                  <div className="fw-bold me-3">
                    {selectedFeatureFlagQ.data?.name}
                  </div>

                  <div className="small me-3">
                    {selectedFeatureFlagQ.data?.description}
                  </div>

                  <Form.Group className="mt-3 mb-3" controlId="strategy">
                    <Form.Label className="fw-bold me-3">Strategy</Form.Label>
                    <Field
                      as="select"
                      name="strategyId"
                      className="form-select"
                    >
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
                  <div>
                    {values.strategyId === "PER_TENANT" ? (
                      <div>
                        <p>Choose tenants to enable</p>
                        <MultiTenantPickerFormikField name="strategy.perTenantStrategy.enabledTenants" />
                      </div>
                    ) : values.strategyId === "USER_LIST" ? (
                      <div>
                        <p>Enter names of users to enable</p>
                        <UserPickerFormikField name="strategy.userListStrategy.users" />
                      </div>
                    ) : values.strategyId === "ENABLED_FOR_ALL" ? (
                      <div>
                        <p>The flag will be enabled for all users</p>
                      </div>
                    ) : values.strategyId ===
                      "ENABLED_FOR_ALL_TENANTS_EXCEPT" ? (
                      <div>
                        <p>
                          Choose tenants to disable (enabled for all others)
                        </p>
                        <MultiTenantPickerFormikField name="strategy.enabledForAllTenantsExceptStrategy.disabledTenants" />
                      </div>
                    ) : (
                      ""
                    )}
                  </div>

                  <Form.Group className="mt-3 mb-3" controlId="publishDate">
                    <Form.Label className="fw-bold me-3">
                      Go-live date
                      <OverlayTrigger
                        overlay={
                          <Tooltip>
                            <small>
                              This feature will be disabled before the go-live
                              date. Afterwards, other criteria will apply
                              according to the strategy.
                            </small>
                          </Tooltip>
                        }
                      >
                        <InfoCircle className="mx-1" />
                      </OverlayTrigger>
                    </Form.Label>
                    <Col sm={4}>
                      <DatePickerField name="publishDate" />
                    </Col>
                    <ErrorMessage
                      name="publishDate"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>

                  <Form.Group className="mt-3 mb-3" controlId="enabled">
                    <Form.Label className="fw-bold me-3">
                      Enabled
                      <OverlayTrigger
                        overlay={
                          <Tooltip>
                            <small>
                              Only enabled features are eligible to be shown,
                              subject to criteria determined by their strategy.
                            </small>
                          </Tooltip>
                        }
                      >
                        <InfoCircle className="mx-1" />
                      </OverlayTrigger>
                    </Form.Label>
                    <Col sm={4}>
                      <Field as="input" type="checkbox" name="enabled" />
                    </Col>
                  </Form.Group>

                  <Form.Group className="mt-3 mb-3" controlId="note">
                    <Form.Label className="fw-bold me-3">
                      User-facing note
                      <OverlayTrigger
                        overlay={
                          <Tooltip>
                            <small>
                              If a note is included, users eligible for this
                              feature will see a banner the next time they
                              launch the app. Clicking the banner will display
                              this and any other unseen notes. (Optional)
                            </small>
                          </Tooltip>
                        }
                      >
                        <InfoCircle className="mx-1" />
                      </OverlayTrigger>
                    </Form.Label>
                    <Col sm={12}>
                      {values.note ? (
                        <div className="border rounded p-2">
                          <Form.Group
                            className="mt-3 mb-3"
                            controlId="note.bannerText"
                          >
                            <Form.Label className="fw-bold me-3">
                              Banner text
                            </Form.Label>
                            <BootstrapField
                              name="note.bannerText"
                              placeholder="banner text"
                            />
                          </Form.Group>

                          <Form.Group className="mt-3 mb-3" controlId="text">
                            <Form.Label className="fw-bold me-3">
                              Note content
                            </Form.Label>
                            <Tabs defaultActiveKey="text" className="mb-3">
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
                                  className="border rounded-1 p-2 mb-3"
                                  style={{ minHeight: "50px" }}
                                >
                                  <div
                                    className="markdown-content-container"
                                    dangerouslySetInnerHTML={
                                      values &&
                                      sanitizedHtml(
                                        marked.parse(values.note.noteText, {
                                          async: false,
                                        }),
                                      )
                                    }
                                  ></div>
                                </div>
                              </Tab>
                            </Tabs>
                          </Form.Group>
                          <div className="fw-bold">Danger zone</div>
                          <Stack direction="horizontal">
                            <OverlayTrigger
                              overlay={
                                <Tooltip>
                                  <small>
                                    Removes the note from this feature flag.
                                    Users will no longer see a note on first app
                                    launch.
                                  </small>
                                </Tooltip>
                              }
                            >
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setFieldValue("note", null)}
                              >
                                Delete note
                              </Button>
                            </OverlayTrigger>
                            <OverlayTrigger
                              overlay={
                                <Tooltip>
                                  <small>
                                    Users who have already seen this note will
                                    see it again the next time they launch the
                                    app.
                                  </small>
                                </Tooltip>
                              }
                            >
                              <Button
                                variant="danger"
                                className="ms-auto"
                                size="sm"
                                onClick={() =>
                                  resetViewTracking(
                                    selectedFeatureFlagQ.data?.name,
                                  )
                                }
                              >
                                Reset view tracking
                              </Button>
                            </OverlayTrigger>
                          </Stack>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setFieldValue("note", {
                              noteText: "",
                              bannerText: "",
                            })
                          }
                        >
                          <Plus />
                        </Button>
                      )}
                    </Col>
                  </Form.Group>
                </Form>
              </Container>
            </Modal.Body>
            <Modal.Footer>
              {resultMessage && (
                <p
                  style={{
                    marginRight: "auto",
                    color:
                      resultMessage === "ok"
                        ? "rgba(var(--bs-success-rgb))"
                        : "rgba(var(--bs-danger-rgb))",
                  }}
                >
                  {resultMessage === "ok" ? "success" : "error"}
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
