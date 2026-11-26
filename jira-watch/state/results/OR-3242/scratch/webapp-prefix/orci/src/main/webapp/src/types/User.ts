import { Static, Symbol as RuntypesSymbol } from "runtypes";
import { TenantID } from "./identifiers";

const LOADING = RuntypesSymbol.withBrand("LOADING");
export const LoadingUser = LOADING.check(Symbol("LOADING"));
export type LOADING = Static<typeof LOADING>;
const LOGGED_OUT = RuntypesSymbol.withBrand("LOGGED_OUT");
export const LoggedOutUser = LOGGED_OUT.check(Symbol("LOGGED_OUT"));
export type LOGGED_OUT = Static<typeof LOGGED_OUT>;
const CHECK_FAILED = RuntypesSymbol.withBrand("CHECK_FAILED");
export const UserCheckFailed = CHECK_FAILED.check(Symbol("CHECK_FAILED"));
export type CHECK_FAILED = Static<typeof CHECK_FAILED>;
export type UserState = LOGGED_OUT | LOADING | CHECK_FAILED | User;

export function isLoggedIn(user: UserState): user is User {
  return typeof user !== "symbol";
}

export function hasRole(user: UserState, role: string): boolean {
  return isLoggedIn(user) && user.roles.includes(role);
}

export function isAdmin(user: UserState): boolean {
  return hasRole(user, "ROLE_ADMIN");
}

export type User = {
  roles: string[];
  username: string;
  name: string;
  clientUserId?: string;
  sessionId: string;
  allowedTenants: TenantID[];
};
