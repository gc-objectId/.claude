import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { logger } from "../utils/logger";
import { TenantID, UserID } from "../types/identifiers";
import { Loadable, loading } from "../types/Loadable";
import {
  isLoggedIn,
  LoadingUser,
  LoggedOutUser,
  UserState,
} from "../types/User";
import { getAppQueryParams } from "../hooks/hooks";
import { MghEpicAuthController, UserInfoController } from "@api";
import type { UserInfoDto } from "@api";

type MghLoginBits = {
  EpicSourceClient: string;
  EpicSourceAuth: string;
  EpicSourceSeq: string;
  userId: UserID;
  tenantId: TenantID;
};

type LoginPayload = { username: string; password: string };

export type LoginResult =
  | {
      type: "loggedIn";
      userDetails: UserInfoDto;
    }
  | {
      type: "redirecting";
    }
  | {
      type: "error";
      error: any;
    };

export type AuthHook = {
  user: UserState;
  doPasswordLogin(payload: LoginPayload): Promise<void>;
  simulateMghLogin(params: MghLoginBits): any;
  logout(): Promise<void>;
  getCsrfToken(): Promise<CsrfState>;
  refreshUser(): Promise<UserState | null>;
  csrfToken: Loadable<CsrfState>;
  login(tenantId: TenantID, userId: UserID | null): Promise<LoginResult>;
  ssoLogin(options?: { nextUrl?: string; redirectUrl?: string }): void;
};

const AuthContext = createContext<AuthHook>({
  user: LoadingUser,
  csrfToken: loading(),
  // intentionally omitting method definitions
} as AuthHook);

export type CsrfState = {
  token: string;
  headerName: string;
};

async function fetchUserInfo(): Promise<UserState> {
  try {
    const { data, error, status } = await UserInfoController.currentUserInfo();
    if (status === 403) {
      return LoggedOutUser;
    }
    if (error || !data) {
      console.error("Unexpected error", error);
      return LoggedOutUser;
    }
    const username = data.username ?? "";
    return {
      roles: data.roles ?? [],
      username,
      name: data.name ?? username,
      clientUserId: data.clientUserId,
      sessionId: data.sessionId,
      allowedTenants: (data.allowedTenants || []) as TenantID[],
    };
  } catch (e) {
    if (e instanceof AxiosError) {
      logger.warn("Auth user retrieval failed:", e);
      return LoggedOutUser;
    }
    throw e;
  }
}

async function fetchCsrfToken(): Promise<CsrfState> {
  // this will set a cookie for future HTTP requests
  const { data } = await axios.get("/csrf");
  const { headerName, token } = data;
  return { token, headerName };
}

const currentUserQueryOptions = queryOptions({
  queryKey: ["auth", "currentUser"],
  queryFn: fetchUserInfo,
  retry: false,
  staleTime: Infinity,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
});

const csrfTokenQueryOptions = queryOptions({
  queryKey: ["auth", "csrf"],
  queryFn: fetchCsrfToken,
  retry: false,
  staleTime: Infinity,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
});

function doLoginCheck(userId: UserID | null, tenantId: TenantID) {
  const userIdEnc = userId == null ? "" : encodeURIComponent(userId);
  return axios.post(
    `/api/login/check?userId=${userIdEnc}`,
    {},
    {
      headers: {
        "X-Tenant-Id": tenantId,
      },
    },
  );
}

export const AuthProvider = ({ children }: PropsWithChildren<{}>) => {
  const queryClient = useQueryClient();

  const userQuery = useQuery(currentUserQueryOptions);
  const user = userQuery.data ?? LoadingUser;

  const csrfQuery = useQuery(csrfTokenQueryOptions);
  const csrfToken: Loadable<CsrfState> = csrfQuery.data ?? loading();

  const retrieveUserInfo = useCallback(async () => {
    await queryClient.cancelQueries({
      queryKey: currentUserQueryOptions.queryKey,
    });
    return queryClient.fetchQuery({ ...currentUserQueryOptions, staleTime: 0 });
  }, [queryClient]);

  const refreshCsrfToken = useCallback(async () => {
    await queryClient.cancelQueries({
      queryKey: csrfTokenQueryOptions.queryKey,
    });
    return queryClient.fetchQuery({ ...csrfTokenQueryOptions, staleTime: 0 });
  }, [queryClient]);

  const getCsrfToken = useCallback(
    () => queryClient.fetchQuery(csrfTokenQueryOptions),
    [queryClient],
  );

  const doPasswordLogin = useCallback(
    async ({ username, password }: LoginPayload) => {
      const formData = new FormData();
      formData.set("username", username);
      formData.set("password", password);
      await axios.post("/api/login/basic", formData);
      await retrieveUserInfo();
      await refreshCsrfToken();
    },
    [refreshCsrfToken, retrieveUserInfo],
  );

  const logout = useCallback(async () => {
    await queryClient.cancelQueries({
      queryKey: currentUserQueryOptions.queryKey,
    });
    queryClient.setQueryData(currentUserQueryOptions.queryKey, LoggedOutUser);
    const response = await axios.post("/api/logout");
    if (response.data.logoutUrl) {
      window.location.replace(response.data.logoutUrl);
    } else {
      await retrieveUserInfo();
    }
  }, [queryClient, retrieveUserInfo]);

  const doMghLogin = useCallback(
    async ({
      EpicSourceClient,
      EpicSourceAuth,
      EpicSourceSeq,
      userId,
      tenantId,
    }: MghLoginBits): Promise<LoginResult> => {
      try {
        const { error } = await MghEpicAuthController.auth({
          body: {
            EpicSourceClient,
            EpicSourceAuth,
            EpicSourceSeq,
            principalId: userId,
          },
          headers: {
            "X-Tenant-Id": tenantId,
          },
        });
        if (error) {
          return {
            type: "error",
            error,
          };
        }
        // The auth endpoint only reports pass/fail; read the session user instead so
        // every login strategy reports the same shape.
        const userInfo = await retrieveUserInfo();
        await refreshCsrfToken();
        if (!isLoggedIn(userInfo)) {
          return {
            type: "error",
            error: "not logged in",
          };
        }
        return {
          type: "loggedIn",
          userDetails: userInfo,
        };
      } catch (e) {
        console.error("error with auth: ", e);
        return {
          type: "error",
          error: e,
        };
      }
    },
    [refreshCsrfToken, retrieveUserInfo],
  );

  // Redirect the browser to the SSO authorization endpoint. nextUrl is where to land after auth
  // completes; it defaults to the current page for in-context logins.
  const ssoLogin = useCallback(
    ({
      nextUrl = window.location.toString(),
      redirectUrl = "/oauth2/authorization/cognito",
    }: { nextUrl?: string; redirectUrl?: string } = {}) => {
      localStorage.setItem("nextUrl", nextUrl);
      const target = window.location.host.startsWith("localhost")
        ? `http://localhost:8080${redirectUrl}`
        : redirectUrl;
      window.location.replace(target);
    },
    [],
  );

  const login = useCallback(
    async (tenantId: TenantID, userId: UserID | null): Promise<LoginResult> => {
      let loginCheckResponse = await doLoginCheck(userId, tenantId);
      if (loginCheckResponse.data.userMismatch) {
        await logout();
        loginCheckResponse = await doLoginCheck(userId, tenantId);
      }
      if (!loginCheckResponse.data.needsLogin) {
        const knownUser = await queryClient.ensureQueryData(
          currentUserQueryOptions,
        );
        const userInfo = isLoggedIn(knownUser)
          ? knownUser
          : await retrieveUserInfo();
        if (isLoggedIn(userInfo)) {
          return {
            type: "loggedIn",
            userDetails: userInfo,
          };
        } else {
          return {
            type: "error",
            error: "not logged in",
          };
        }
      }

      switch (loginCheckResponse.data.strategy) {
        case "SSO":
          ssoLogin({ redirectUrl: loginCheckResponse.data.redirectUrl });
          return {
            type: "redirecting",
          };
        case "mgb":
          const search = window.location.search;
          const queryParams = getAppQueryParams(new URLSearchParams(search));
          const payload: MghLoginBits = {
            EpicSourceClient: queryParams.epicSourceClient,
            userId: queryParams.userId,
            tenantId: queryParams.tenantId,
            EpicSourceAuth: queryParams.epicSourceAuth,
            EpicSourceSeq: queryParams.epicSourceSeq,
          };
          return await doMghLogin(payload);
        default:
          throw new Error(
            `Unknown login strategy: ${loginCheckResponse.data.strategy}`,
          );
      }
    },
    [doMghLogin, logout, queryClient, retrieveUserInfo, ssoLogin],
  );

  const value = useMemo<AuthHook>(
    () => ({
      user,
      doPasswordLogin,
      refreshUser: retrieveUserInfo,
      logout,
      simulateMghLogin: doMghLogin,
      getCsrfToken,
      csrfToken,
      login,
      ssoLogin,
    }),
    [
      user,
      doPasswordLogin,
      retrieveUserInfo,
      logout,
      doMghLogin,
      getCsrfToken,
      csrfToken,
      login,
      ssoLogin,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
