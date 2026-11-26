import { ConfigFileDto } from "@api";

/**
 * Whether importing this file deletes the tenant's existing rows.
 *
 * Branches on `semanticsKey`, the backend enum constant, not on `semantics`, which is a human
 * label. Renaming the label must never quietly drop the destructive-import warning.
 */
export function replacesAll(configFile: ConfigFileDto): boolean {
  return configFile.semanticsKey === "REPLACE_ALL";
}
