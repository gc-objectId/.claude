---
name: project-or3200-config-import-wipe
description: "OR-3200: a replacesAll config import with zero data rows wipes the tenant's rows; 11 of 12 importers have no guard at all"
metadata:
  node_type: memory
  type: project
---

**OR-3200** (Bug, To Do, filed 2026-11-17). Found while vetting the coverage backlog, not from a
Sentry event or a report — nobody has hit it yet.

`POST /api/admin/config-files/{key}/upload` rejects only a zero-byte file. A header-only CSV passes,
parses to zero data rows, and reaches a `replacesAll` importer, which calls `deleteAll()` then
`saveAll(emptyList)`. The tenant's rows for that config are gone.

`AntibioticPathwayCSVImporter` is the **only** one of twelve `replacesAll` importers with guards, and
all three assume at least one row was read (`rowCounter` starts at 1 and increments per data row, so
`rowCounter > 1` is false for a header-only file). The other eleven have no guard of any kind.

The fix belongs in `ConfigImportController`, which already computes `countBefore` and `countAfter`
around the import and returns both: refuse a `replacesAll` import that takes a non-zero count to
zero, and one guard covers every importer.

**Why it matters clinically:** the comment above the antibiotic guards says it — a tenant left with
no pathways reads downstream as "no prophylaxis needed" and *silences* the antibiotic alerts rather
than raising one. Empty config fails open.

Context: [[project-automation-backlog-vetting]].
