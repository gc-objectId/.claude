import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "react-bootstrap";

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
  return state == "done" ? <Navigate to={"/"} /> : <Spinner />;
}
