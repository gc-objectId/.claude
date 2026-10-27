import { Static, Symbol as RuntypesSymbol } from "runtypes";
import { TenantID } from "./identifiers";

const LOADING = RuntypesSymbol.withBrand("LOADING");
export const LoadingUser = LOADING.check(Symbol("LOADING"));
export type LOADING = Static<typeof LOADING>;
const LOGGED_OUT = RuntypesSymbol.withBrand("LOADING");
export const LoggedOutUser = LOGGED_OUT.check(Symbol("LOGGED_OUT"));
export type LOGGED_OUT = Static<typeof LOGGED_OUT>;
export type UserState = LOGGED_OUT | LOADING | User;

export function isLoggedIn(user: UserState): user is User {
  return user !== LoggedOutUser && user !== LoadingUser;
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
