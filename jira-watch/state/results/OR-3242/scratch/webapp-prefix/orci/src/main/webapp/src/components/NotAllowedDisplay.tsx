import { Link } from "react-router-dom";
import { Interstitial } from "./Interstitial";

export function NotAllowedDisplay() {
  return (
    <Interstitial title="Not allowed" tone="muted">
      <p>This page is for administrators.</p>
      <Link to="/">Go to the home page</Link>
    </Interstitial>
  );
}
