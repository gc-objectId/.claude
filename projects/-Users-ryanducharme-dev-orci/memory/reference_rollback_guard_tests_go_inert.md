---
name: rollback-guard-tests-go-inert
description: "A @Transactional(rollbackFor=Exception.class) test that asserts isInstanceOf(Exception.class) is usually inert — Spring's default policy already rolls back unchecked, and Jackson's MappingIterator wraps row errors into RuntimeException."
metadata: 
  node_type: memory
  type: reference
  originSessionId: fdfd8243-fe23-4fcc-83d8-4e69d2d87a2b
  modified: 2026-08-14T19:47:14.263Z
---

Found on OR-2731. All three data-loss guard tests for the config-import feature passed with their guard removed.

**The trap:** `@Transactional`'s default policy rolls back on `RuntimeException`/`Error` and *commits* on checked exceptions. `rollbackFor = Exception.class` only matters when the failure arrives **checked**. A test that asserts `.isInstanceOf(Exception.class)` cannot tell the two apart, so it passes either way.

**Jackson CSV specifically** — verified by probing the project's own jackson-dataformat-csv:

| Malformed | Thrown from | Type |
|---|---|---|
| data **row** | `MappingIterator.next()` via `forEachRemaining` | `RuntimeException` (wrapped — `next()` can't throw checked) |
| **header** | `readValues(...)` | `JsonParseException` — checked `IOException` |

So only a bad *header* exercises `rollbackFor`. Both original tests used a bad row.

**Method that caught it:** flip the production guard off, rerun, confirm the test goes red. Verify the flip actually compiled (`javap -v -p` and check `RuntimeVisibleAnnotations` — a bare `@Transactional` shows `0: #N()` with no element values) before trusting a still-green result. Applies to any absence/rollback assertion; see [[feedback_validation_protocol]].

**Second trap in the same file:** a rename/normalization guard tested by wrapping a source that *already* has the correct name proves nothing. Feed it the mangled input the way production does — for `UploadedConfigFileResource` that means a `MockMultipartFile` carrying the browser's filename, matching `ConfigImportController`.

**Third:** once a committing test (`AbstractCommittingIntegrationTest`) deletes seeded reference data, the base class will not restore it — seeded tables are exempt from its per-test cleanup. A broken guard therefore cascades into later tests in the class failing on their `isPositive()` precondition. Noise, not a bug, but don't chase it.
