---
name: reference_stale_worktree_ci_merge_compile
description: "Long-lived worktree branch + moved main = CI merge-build compile failures that local builds don't catch; rebase before pushing"
metadata: 
  node_type: memory
  type: reference
  originSessionId: bf7624f0-6736-447c-95b3-0759ba140636
  modified: 2026-07-24T20:14:55.657Z
---

GitHub CI builds the PR **merged into main**, not the branch in isolation. So when a worktree branch is old and `main` has since refactored a shared signature, the merge exposes a compile error that a local `mvn install` on the branch never sees (it compiles the stale self-consistent branch). Symptom: CI `build` job fails at `COMPILATION ERROR` with type mismatches whose **line numbers don't match your working file** — the tell that CI compiled a merge, not your tree.

Hit on OR-2621 (2026-07-24): branch was ~2 weeks stale; main's OR-2640 refactor renamed `MayoHL7RasMedAdminProcessor.lookupNdc` to return `Optional<MedicationNDCMapping>` (was `Optional<Medication>`), so my new call sites broke only in the merge. Local build was green.

**Fix pattern:** `git fetch origin main`, check `git log HEAD..origin/main` — if behind and touching the same files, rebase onto current main (or `git reset --hard origin/main` + re-apply for a clean single commit) before pushing; force-with-lease is fine on a solo feature branch. After a big version bump on main (maven-release-plugin), a full `mvn install -DskipTests` from root is needed so every sibling jar is at the new SNAPSHOT before module-scoped builds resolve.

Also seen same session: `MayoHL7RasMedAdminProcessorIntegrationTest` errors locally on clean main with a `client_medication_mappings.medication_id` NOT NULL violation — a Hibernate ddl-auto vs Liquibase (changeset 159 makes the FK nullable) test-schema mismatch; reproduces with/without local changes, passes in CI. Local-only; trust CI. Related: [[project_maven_stale_classpath]], [[reference_mayo_hl7_test_tz_coupling]].
