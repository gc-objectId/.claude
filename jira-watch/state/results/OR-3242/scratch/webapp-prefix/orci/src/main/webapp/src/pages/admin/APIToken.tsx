import "../../App.scss";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import { AdminTable } from "../../components/Admin/AdminTable";
import { SectionHeader } from "../../components/SectionHeader";
import {
  Button,
  Form,
  Modal,
  Nav,
  Spinner,
  Tab,
  Toast,
  ToastContainer,
} from "react-bootstrap";

import { useCallback, useEffect, useState } from "react";
import { useCopyToClipboard } from "@uidotdev/usehooks";
import { ApiTokenController } from "@api/sdk.gen";
import { ApiTokenDto, BrandTenantKey } from "@api/types.gen";
import { TokenType } from "../../types/APIToken";
import { isLoading, Loadable, loading } from "../../types/Loadable";
import { Clipboard, Trash, Plus, Eye, EyeSlash } from "react-bootstrap-icons";
import { TenantID } from "../../types/identifiers";
import { TenantPicker } from "../../components/Admin/TenantPicker";
import { UserPicker, User } from "../../components/Admin/UserPicker";
import { useAdminPanelContext } from "../../context/AdminPanelContext";

const ORG_OPTIONS = [
  { value: "MGB", label: "MGB" },
  { value: "DEMO", label: "DEMO" },
  { value: "MAYO", label: "MAYO" },
] as const;

type OrgValue = (typeof ORG_OPTIONS)[number]["value"];

interface ToastMessage {
  id: string;
  message: string;
  variant: "success" | "danger";
}

export function APITokenAdminContent() {
  const { tenantId: ctxTenantId } = useAdminPanelContext();
  const [userTokens, setUserTokens] = useState<Loadable<ApiTokenDto[]>>(
    loading(),
  );
  const [tenantTokens, setTenantTokens] = useState<Loadable<ApiTokenDto[]>>(
    loading(),
  );
  const [orgTokens, setOrgTokens] = useState<Loadable<ApiTokenDto[]>>(
    loading(),
  );
  const [activeTab, setActiveTab] = useState<string>("user");
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantID | undefined>(
    ctxTenantId,
  );
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrgValue | "">("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    token: ApiTokenDto | null;
  }>({ show: false, token: null });

  const addToast = useCallback(
    (message: string, variant: "success" | "danger") => {
      const toast: ToastMessage = {
        id: Date.now().toString(),
        message,
        variant,
      };
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 5000);
    },
    [],
  );

  const fetchUserTokens = useCallback(async () => {
    const { data, error } = await ApiTokenController.listAllUserApiTokens();
    if (error || !data) {
      console.error("Failed to fetch user tokens:", error);
      addToast("Access denied. Admin privileges required.", "danger");
      return;
    }
    setUserTokens(data);
  }, [addToast]);

  const fetchTenantTokens = useCallback(async () => {
    const { data, error } = await ApiTokenController.listTenantApiTokens();
    if (error || !data) {
      console.error("Failed to fetch tenant tokens:", error);
      addToast("Access denied. Admin privileges required.", "danger");
      return;
    }
    setTenantTokens(data);
  }, [addToast]);

  const fetchOrgTokens = useCallback(async () => {
    const { data, error } = await ApiTokenController.listOrgApiTokens();
    if (error || !data) {
      console.error("Failed to fetch org tokens:", error);
      addToast("Access denied. Admin privileges required.", "danger");
      return;
    }
    setOrgTokens(data);
  }, [addToast]);

  useEffect(() => {
    fetchUserTokens();
    fetchTenantTokens();
    fetchOrgTokens();
  }, [fetchUserTokens, fetchTenantTokens, fetchOrgTokens]);

  const createTenantToken = useCallback(async () => {
    if (!selectedTenant) {
      addToast("Please select a tenant", "danger");
      return;
    }

    const { error } = await ApiTokenController.createTenantApiToken({
      path: { tenantKey: BrandTenantKey.check(selectedTenant) },
    });
    if (error) {
      addToast("Failed to create tenant token", "danger");
      return;
    }
    addToast(`Tenant token created for ${selectedTenant}`, "success");
    fetchTenantTokens();
    setShowClientModal(false);
    setSelectedTenant(undefined);
  }, [selectedTenant, addToast, fetchTenantTokens]);

  const createUserToken = useCallback(async () => {
    if (!selectedUser) {
      addToast("Please select a user", "danger");
      return;
    }

    const { error } = await ApiTokenController.createUserApiTokenForUser({
      path: { userId: selectedUser.id },
    });
    if (error) {
      addToast("Failed to create user token", "danger");
      return;
    }
    const userName =
      selectedUser.fullName ||
      selectedUser.username ||
      selectedUser.clientUserId;
    addToast(`User token created for ${userName}`, "success");
    fetchUserTokens();
    setShowUserModal(false);
    setSelectedUser(undefined);
  }, [selectedUser, addToast, fetchUserTokens]);

  const createOrgToken = useCallback(async () => {
    if (!selectedOrg) {
      addToast("Please select an org", "danger");
      return;
    }

    const { error } = await ApiTokenController.createOrgApiToken({
      path: { org: selectedOrg },
    });
    if (error) {
      addToast("Failed to create org token", "danger");
      return;
    }
    addToast(`Org token created for ${selectedOrg}`, "success");
    fetchOrgTokens();
    setShowOrgModal(false);
    setSelectedOrg("");
  }, [selectedOrg, addToast, fetchOrgTokens]);

  const deleteToken = useCallback(
    async (token: ApiTokenDto) => {
      const { error } = await ApiTokenController.deleteApiToken({
        path: { tokenString: token.token! },
      });
      if (error) {
        addToast("Failed to delete token", "danger");
        setDeleteConfirm({ show: false, token: null });
        return;
      }
      addToast(`${token.tokenType} token deleted successfully`, "success");
      if (token.tokenType === "USER") {
        fetchUserTokens();
      } else if (token.tokenType === "ORG") {
        fetchOrgTokens();
      } else {
        fetchTenantTokens();
      }
      setDeleteConfirm({ show: false, token: null });
    },
    [fetchUserTokens, fetchTenantTokens, fetchOrgTokens, addToast],
  );

  const [, copyToClipboard] = useCopyToClipboard();

  const handleCopyToClipboard = useCallback(
    (token: string) => {
      copyToClipboard(token);
      addToast("Token copied to clipboard", "success");
    },
    [copyToClipboard, addToast],
  );

  const toggleTokenVisibility = useCallback((token: string) => {
    setVisibleTokens((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(token)) {
        newSet.delete(token);
      } else {
        newSet.add(token);
      }
      return newSet;
    });
  }, []);

  const formatToken = (token: string) => {
    if (visibleTokens.has(token)) {
      return token;
    }
    return token.substring(0, 12) + "•".repeat(52);
  };

  const getOwnerInfo = (token: ApiTokenDto) => {
    if (token.tokenType === "USER") {
      return token.userFullName || token.username;
    } else if (token.tokenType === "ORG") {
      return token.orgKey ?? "—";
    } else {
      return token.tenantName || token.tenantKey;
    }
  };

  const renderTokenTable = (
    tokens: Loadable<ApiTokenDto[]>,
    type: TokenType,
  ) => {
    if (isLoading(tokens)) {
      return (
        <div className="admin-empty">
          <Spinner size="sm" aria-hidden="true" />
          Loading tokens…
        </div>
      );
    }

    const all = tokens as ApiTokenDto[];
    if (!globalThis.Array.isArray(all)) {
      return <div className="admin-empty">No tokens available</div>;
    }

    const filtered = all.filter((t) => t.tokenType === type);

    return (
      <AdminTable>
        <thead>
          <tr>
            <th>Type</th>
            <th>Owner</th>
            <th>Token</th>
            <th>Created</th>
            <th>
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="admin-table__empty">
                No {type.toLowerCase()} tokens found
              </td>
            </tr>
          )}
          {filtered.map((token) => (
            <tr key={token.id}>
              <td>
                <span className="guided-tag">{token.tokenType}</span>
              </td>
              <td>{getOwnerInfo(token)}</td>
              <td>
                <div className="api-token">
                  <span className="admin-code">
                    {token.token && formatToken(token.token)}
                  </span>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="admin-icon-button"
                    onClick={() =>
                      token.token && toggleTokenVisibility(token.token)
                    }
                    title={
                      token.token && visibleTokens.has(token.token)
                        ? "Hide token"
                        : "Show token"
                    }
                    aria-label={
                      token.token && visibleTokens.has(token.token)
                        ? "Hide token"
                        : "Show token"
                    }
                  >
                    {token.token && visibleTokens.has(token.token) ? (
                      <EyeSlash aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                  </Button>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="admin-icon-button"
                    onClick={() =>
                      token.token && handleCopyToClipboard(token.token)
                    }
                    title="Copy to clipboard"
                    aria-label="Copy token to clipboard"
                  >
                    <Clipboard aria-hidden="true" />
                  </Button>
                </div>
              </td>
              <td>
                {token.createdDate &&
                  new Date(token.createdDate).toLocaleDateString()}
              </td>
              <td>
                <div className="admin-table__actions">
                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="admin-icon-button"
                    onClick={() => setDeleteConfirm({ show: true, token })}
                    title="Delete token"
                    aria-label="Delete token"
                  >
                    <Trash aria-hidden="true" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    );
  };

  const createButton = (label: string, onClick: () => void) => (
    <Button variant="primary" onClick={onClick}>
      <Plus aria-hidden="true" /> {label}
    </Button>
  );

  return (
    <>
      <AdminPageHeader
        title="API Tokens"
        meta="Integration credentials for users, tenants, and organizations."
      />

      <Tab.Container
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k || "user")}
      >
        <Nav variant="tabs" className="admin-tabs mb-3">
          <Nav.Item>
            <Nav.Link eventKey="user">User Tokens</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="tenant">Tenant Tokens</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="org">Org Tokens</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="user">
            <SectionHeader
              title="User API Tokens"
              actions={createButton("Create User Token", () =>
                setShowUserModal(true),
              )}
            />
            <p className="admin-section__lede">
              All user tokens created by individual users across the system.
            </p>
            {renderTokenTable(userTokens, "USER")}
          </Tab.Pane>

          <Tab.Pane eventKey="tenant">
            <SectionHeader
              title="Client API Tokens"
              actions={createButton("Create Client Token", () =>
                setShowClientModal(true),
              )}
            />
            <p className="admin-section__lede">
              Client tokens are tied to a specific tenant.
            </p>
            {renderTokenTable(tenantTokens, "TENANT")}
          </Tab.Pane>

          <Tab.Pane eventKey="org">
            <SectionHeader
              title="Org API Tokens"
              actions={createButton("Create Org Token", () =>
                setShowOrgModal(true),
              )}
            />
            <p className="admin-section__lede">
              Org tokens work across all facilities in an organization.
            </p>
            {renderTokenTable(orgTokens, "ORG")}
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* Create Client Token Modal */}
      <Modal show={showClientModal} onHide={() => setShowClientModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create Client Token</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label htmlFor="client-token-tenant">Tenant</Form.Label>
            <TenantPicker
              inputId="client-token-tenant"
              value={selectedTenant}
              onChange={setSelectedTenant}
            />
          </Form.Group>
          <p className="admin-section__lede mb-0">
            Client tokens are restricted to the selected tenant and can only
            access that tenant&apos;s data.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowClientModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={createTenantToken}
            disabled={!selectedTenant}
          >
            Create Token
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Create User Token Modal */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create User Token</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>User</Form.Label>
            <UserPicker
              isMulti={false}
              value={selectedUser}
              onChange={(user) => setSelectedUser(user || undefined)}
            />
          </Form.Group>
          <p className="admin-section__lede mb-0">
            User tokens will be created for the selected user and allow API
            access on their behalf.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUserModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={createUserToken}
            disabled={!selectedUser}
          >
            Create Token
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Create Org Token Modal */}
      <Modal
        show={showOrgModal}
        onHide={() => {
          setShowOrgModal(false);
          setSelectedOrg("");
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Create Org Token</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="org-token-org">
            <Form.Label>Organization</Form.Label>
            <Form.Select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value as OrgValue | "")}
            >
              <option value="">Select...</option>
              {ORG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <p className="admin-section__lede mb-0">
            Org tokens work across all facilities in the selected organization.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowOrgModal(false);
              setSelectedOrg("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={createOrgToken}
            disabled={!selectedOrg}
          >
            Create Token
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={deleteConfirm.show}
        onHide={() => setDeleteConfirm({ show: false, token: null })}
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteConfirm.token && (
            <p>
              Are you sure you want to delete this{" "}
              {deleteConfirm.token.tokenType?.toLowerCase()} token for{" "}
              <strong>{getOwnerInfo(deleteConfirm.token)}</strong>?
            </p>
          )}
          <p className="text-danger mb-0">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setDeleteConfirm({ show: false, token: null })}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              deleteConfirm.token && deleteToken(deleteConfirm.token)
            }
          >
            Delete Token
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast Notifications */}
      <ToastContainer position="top-end" className="p-3">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            bg={toast.variant}
            onClose={() =>
              setToasts((prev) => prev.filter((t) => t.id !== toast.id))
            }
            show={true}
            delay={5000}
            autohide
          >
            <Toast.Body className="text-white">{toast.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </>
  );
}

export function APITokenAdmin() {
  return (
    <AdminPage>
      <APITokenAdminContent />
    </AdminPage>
  );
}
