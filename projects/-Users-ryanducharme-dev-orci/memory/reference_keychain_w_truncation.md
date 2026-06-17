---
name: reference-keychain-w-truncation
description: macOS security -w interactive prompt truncates long pastes (~128 chars); write secrets from a variable instead
metadata: 
  node_type: memory
  type: reference
  originSessionId: 17c3b85c-22bc-463d-8ca2-78715ff3cea1
---

The macOS `security add-generic-password ... -w` *interactive* prompt truncates long pasted secrets at ~128 characters (its input buffer is smaller than readline's). Both the password and "retype" entries truncate identically, so it silently "matches" and stores a broken value — auth then fails with no obvious cause.

Hit this setting up the `jira-api-token` keychain item for `workon`'s Jira issue-type auto-detect: a 192-char Atlassian API token stored as 128 chars → 401 (Jira masks failed basic auth as a 404 on issue endpoints, which made it look like a permission problem at first).

**How to apply:** read the secret into a shell variable first (`read -rs "TOKEN?..."`), verify length, then write the keychain item non-interactively from the variable: `security add-generic-password -a "$USER" -s <name> -U -w "$TOKEN"`. `-U` updates an existing item. `"$VAR"` keeps the literal text (not the secret) in shell history. Verify with `security find-generic-password -s <name> -w | wc -c`.
