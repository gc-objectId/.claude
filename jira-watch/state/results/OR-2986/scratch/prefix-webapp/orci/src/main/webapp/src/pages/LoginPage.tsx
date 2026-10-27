import React, { useEffect } from "react";
import BSForm from "react-bootstrap/Form";
import { Alert, Button, Card, Col, Container, Row } from "react-bootstrap";
import { Form, Formik } from "formik";
import { BootstrapField } from "../components/Form/BootstrapField";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isLoggedIn } from "../types/User";

import { logger } from "../utils/logger";
// Resolve the post-login destination. Never route back to the login page (would loop) and never
// off-site: the SSO flow finishes with window.location.replace, so an external next would be an
// open redirect. Resolve against our own origin and reject anything that lands elsewhere; the URL
// parser normalizes the tricks a prefix check misses (backslashes, tabs, protocol-relative).
// Falls back to the app index.
function safeRedirectTarget(next: string | null): string {
  if (!next) return "/";
  let url: URL;
  try {
    url = new URL(next, window.location.origin);
  } catch {
    return "/";
  }
  if (url.origin !== window.location.origin) return "/";
  const path = url.pathname + url.search + url.hash;
  if (
    path === "/login" ||
    path.startsWith("/login?") ||
    path.startsWith("/login/")
  )
    return "/";
  return path;
}

export function LoginPage() {
  const next = new URLSearchParams(window.location.search).get("next");
  const redirectTarget = safeRedirectTarget(next);
  const navigate = useNavigate();
  const auth = useAuth();

  // An explicit ?next= may point at a server-rendered page (e.g. /qa-suite-report) that has no
  // React route — those need a full page load to reach the server. Plain logins stay client-side.
  const goToRedirectTarget = (replace: boolean) => {
    if (next) {
      window.location.replace(redirectTarget);
    } else {
      navigate(redirectTarget, { replace });
    }
  };

  // Don't show the login form to an already-authenticated user (e.g. after SSO completes).
  useEffect(() => {
    if (isLoggedIn(auth.user)) {
      goToRedirectTarget(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user, next, redirectTarget, navigate]);

  return (
    <Container>
      <Row className="justify-content-md-center">
        <Col lg={4}>
          <Formik
            initialValues={{ username: "", password: "" }}
            onSubmit={async (values, actions) => {
              actions.setStatus({});
              logger.debug("submitting login...");
              try {
                await auth.doPasswordLogin({
                  username: values.username,
                  password: values.password,
                });
                goToRedirectTarget(false);
              } catch (e) {
                if (e instanceof AxiosError) {
                  console.error("login error, status was", e.response?.status);
                  const status = e.response?.status;
                  const errorMessage =
                    status === 401 || status === 403
                      ? "Unable to log in with provided credentials"
                      : "Unable to process request at this time";
                  actions.setStatus({
                    error: errorMessage,
                  });
                }
                return;
              }
            }}
          >
            {({ status }) => (
              <Card className="mt-5">
                <Card.Header as="h5">Log In</Card.Header>
                <Card.Body>
                  <Form>
                    {status?.error && (
                      <Alert className="mt-3 mb-3" variant="danger">
                        {status.error}
                      </Alert>
                    )}
                    <BSForm.Group className="mt-3 mb-3" controlId="username">
                      <BSForm.Label className="fw-bold me-3">
                        Username:{" "}
                      </BSForm.Label>
                      <BootstrapField name="username" placeholder="Username" />
                    </BSForm.Group>
                    <BSForm.Group className="mt-3 mb-3" controlId="password">
                      <BSForm.Label className="fw-bold me-3">
                        Password:{" "}
                      </BSForm.Label>
                      <BootstrapField type="password" name="password" />
                    </BSForm.Group>
                    <Button type="submit">Log in</Button>
                  </Form>
                  <hr className="my-3" />
                  <Button
                    variant="outline-primary"
                    type="button"
                    className="w-100"
                    onClick={() => auth.ssoLogin({ nextUrl: redirectTarget })}
                  >
                    Sign in with SSO
                  </Button>
                </Card.Body>
              </Card>
            )}
          </Formik>
        </Col>
      </Row>
    </Container>
  );
}
