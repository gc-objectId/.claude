import { Dropdown } from "react-bootstrap";
import { PersonCircle } from "react-bootstrap-icons";
import { User } from "../types/User";
import "./AccountMenu.scss";

export function AccountMenu({ user }: { user: User }) {
  return (
    <Dropdown align="end" className="account-menu">
      <Dropdown.Toggle
        variant="link"
        className="account-menu__toggle"
        aria-label="Account menu"
      >
        <PersonCircle size={28} aria-hidden="true" />
      </Dropdown.Toggle>
      <Dropdown.Menu className="account-menu__menu">
        <Dropdown.Header className="account-menu__header">
          <span className="guided-eyebrow">Signed in as</span>
          <span className="account-menu__name">{user.username}</span>
          {user.clientUserId && user.clientUserId !== user.username && (
            <span className="account-menu__client">
              Client user {user.clientUserId}
            </span>
          )}
        </Dropdown.Header>
        <Dropdown.Divider />
        <Dropdown.Item href="/logout">Log out</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}
