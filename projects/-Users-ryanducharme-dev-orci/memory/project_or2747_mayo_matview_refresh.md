---
name: project-or2747-mayo-matview-refresh
description: Mayo analytics rollup matviews are refreshed by hand with no staleness indicator — a frozen error rate is indistinguishable from a current one
metadata:
  type: project
---

Mayo error rate (Metabase card 55) reads two materialized views in `"mayo-mayo"`:
`mayo_shared_metric_firing_daily_rollup_mv` and `mayo_shared_metric_med_admin_daily_rollup_mv`.

Both are refreshed **manually**. No pg_cron (prod has only plpgsql), no Metabase transform, no
scheduled job. The card carries no staleness indicator, so **a stale number looks exactly like a
current one**. OR-2747 (To Do) would add a daily job after midnight US/Central — the timing matters
because the rollups key on `event_date_local` / `operation_start_date_local`, so an earlier refresh
leaves the final day partial. Refresh SQL already exists as `mayo-mayo/refresh_daily_rollups.sql`
in PR #4283.

**Why this matters for sign-off:** combined with [[project_or2734_nmb_clipping_unfixed]], any Mayo
error-rate figure quoted from the silent-mode soak has two independent trust problems — a biased
predicate and an unknown refresh date. Verify both views were refreshed before citing a number.
Last confirmed fresh 2026-08-07 (matview and live fact views agreed exactly).
