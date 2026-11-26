import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "react-bootstrap";
import { Interstitial } from "../components/Interstitial";

export function LogoutPage() {
  const auth = useAuth();
  const [state, setState] = useState<"not-started" | "logging-out" | "done">(
    "not-started",
  );

  useEffect(() => {
    if (state === "not-started") {
      setState("logging-out");
      (async () => {
        await auth.logout();
        setState("done");
      })();
    }
  }, [state, auth]);
  if (state == "done") {
    return <Navigate to={"/"} />;
  }
  return (
    <Interstitial title="Signing out">
      <Spinner animation="border" role="status">
        <span className="visually-hidden">Signing out</span>
      </Spinner>
    </Interstitial>
  );
}
