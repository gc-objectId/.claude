import React, { PropsWithChildren } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import {
  isAdmin,
  LoadingUser,
  LoggedOutUser,
  UserCheckFailed,
} from "../types/User";
import { NotAllowedDisplay } from "./NotAllowedDisplay";
import { PageLoading } from "./PageLoading";
import ErrorPage from "../pages/ErrorPage";

export type ProtectedRouteProps = {};

export const ProtectedRoute = ({
  children,
}: PropsWithChildren<ProtectedRouteProps>) => {
  const { user } = useAuth();
  const location = useLocation();
  if (user === LoadingUser) {
    return <PageLoading />;
  }
  if (user === UserCheckFailed) {
    return <ErrorPage />;
  }
  if (user === LoggedOutUser) {
    const returnTarget = location.pathname + location.search + location.hash;
    return <Navigate to={`/login?next=${encodeURIComponent(returnTarget)}`} />;
  }
  if (!isAdmin(user)) {
    return <NotAllowedDisplay />;
  }
  return <>{children}</>;
};
