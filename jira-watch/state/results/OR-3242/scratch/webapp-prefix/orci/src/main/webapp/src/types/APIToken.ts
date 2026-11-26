import {
  Record,
  Static,
  String,
  Union,
  Literal,
  Null,
  Boolean,
} from "runtypes";
import { APITokenString, TenantID, UserID } from "./identifiers";

export const TokenType = Union(
  Literal("USER"),
  Literal("TENANT"),
  Literal("ORG"),
);

export const APIToken = Record({
  id: String,
  token: APITokenString,
  createdDate: String,
  tokenType: TokenType,
  valid: Boolean,
  userId: String.nullable(),
  username: String.nullable(),
  tenantKey: String.nullable(),
  tenantName: String.nullable(),
  userFullName: String.nullable(),
  orgKey: String.nullable(),
});

export type APIToken = Static<typeof APIToken>;
export type TokenType = Static<typeof TokenType>;
