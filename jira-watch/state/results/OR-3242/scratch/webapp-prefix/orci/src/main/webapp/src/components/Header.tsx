import { Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isLoggedIn } from "../types/User";
import { AccountMenu } from "./AccountMenu";
import "./Header.scss";

function Header({ fluid = false }: { fluid?: boolean }) {
  const { user } = useAuth();

  return (
    <header className="admin-header">
      <Container fluid={fluid || "md"} className="admin-header__inner">
        <div className="admin-header__brand">
          <Link to="/" className="guided-product-mark admin-header__product">
            GuidedOR
          </Link>
          <span className="guided-eyebrow">Admin</span>
        </div>
        {isLoggedIn(user) && <AccountMenu user={user} />}
      </Container>
    </header>
  );
}

export default Header;
