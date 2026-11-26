import React, { useEffect } from "react";
import { Spinner } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import { Interstitial } from "../components/Interstitial";

export function SSOResponse() {
  let [searchParams, setSearchParams] = useSearchParams();
  const authenticationFailure = searchParams.get("authenticationFailure");
  const message = searchParams.get("message");

  useEffect(() => {
    const nextUrl = localStorage.getItem("nextUrl");
    localStorage.removeItem("nextUrl");
    if (nextUrl && !authenticationFailure) {
      // nextUrl is untrusted at this boundary (any same-origin script can set the key), and
      // window.location.replace honors off-site hosts. Resolve against our origin and drop
      // anything that escapes it, so a poisoned nextUrl can't turn this into an open redirect.
      try {
        const target = new URL(nextUrl, window.location.origin);
        if (target.origin === window.location.origin) {
          window.location.replace(
            target.pathname + target.search + target.hash,
          );
        } else {
          window.location.replace("/");
        }
      } catch {
        window.location.replace("/");
      }
    }
  }, [authenticationFailure]);

  return authenticationFailure ? (
    <Interstitial title="SSO authentication failed" tone="danger">
      <p>Please contact your administrator and report this error.</p>
      {message && <pre>{message}</pre>}
    </Interstitial>
  ) : (
    <Interstitial title="Authenticating">
      <Spinner animation="border" role="status">
        <span className="visually-hidden">Authenticating</span>
      </Spinner>
    </Interstitial>
  );
}
