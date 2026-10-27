import React, { PropsWithChildren } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { Col, Row, Spinner } from "react-bootstrap";
import { isLoggedIn, LoadingUser, LoggedOutUser } from "../types/User";

export type ProtectedRouteProps = {};

export const ProtectedRoute = ({
  children,
}: PropsWithChildren<ProtectedRouteProps>) => {
  const { user } = useAuth();
  const location = useLocation();
  if (user === LoadingUser) {
    return <Spinner />;
  }
  if (user === LoggedOutUser) {
    return <Navigate to={`/login?next=${location.pathname}`} />;
  }
  if (isLoggedIn(user)) {
    if (!user.roles.includes("ROLE_ADMIN")) {
      return <Navigate to={`/login?next=${location.pathname}`} />;
    }
  }
  return <>{children}</>;
};
