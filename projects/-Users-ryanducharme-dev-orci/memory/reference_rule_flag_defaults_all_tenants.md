---
name: rule-feature-flag-defaults-to-all-tenants
description: "A new rule with no Liquibase changeset ships enabled for EVERY tenant — Mayo-only requires an explicit PER_TENANT changeset; @RuleDefinition has no orgs attribute"
metadata:
  node_type: memory
  type: reference
---

`RuleFeatureFlagService.createRuleFeatureFlag` auto-creates a `RULE:<id>` flag on startup for any rule that lacks one, using `ENABLED_FOR_ALL_TENANTS_EXCEPT` with an **empty** exception set. A new rule with no changeset is therefore **on for every tenant**, silently.

There is no code-level org gating for rules: `@RuleDefinition` has no `orgs` attribute (the PR adding one, #4165, was closed). Tenant scoping is either an explicit `PER_TENANT` changeset or a hand-written `TenantContextHolder.getTenant().getOrg() == TenantKey.Org.MAYO` guard inside the service the rule calls.

**Why:** a rule intended as Mayo-only can ship enabled everywhere and stay quiet purely because other tenants don't map the procedure identifiers it keys on. That is data coincidence, not a guarantee — it switches on the day someone maps one. This is exactly what happened with `a-preop-doxycycline-check` (see [[project_or2711_mayo_vs_all_clients_scoping]]); product ruled all-clients was intended, but nobody had decided it.

**How to apply:** when a ticket says "only applies to Mayo", grep `orci/src/main/resources/db/liquibase/platform/change-sets/` for a `rule-feature-flag-<id>` changeset. Templates: 033 and 036 (`PER_TENANT`, `{"enabledTenants":["mayo-rosmc","mayo-rormc","mayo-mayo"],"enableDate":0}`); 034 shows the idempotent jsonb append for adding a tenant. Verify the deployed state with `SELECT feature_name, strategy_id, strategy_params FROM public.feature_flags WHERE feature_name LIKE 'RULE:%'` — the flag table is the runtime truth, not the annotation.

Note `/api/feature-flags` returns only UI `FeatureId` enum values, **not** `RULE:` flags — it is useless for checking rule gating and will read as a uniform "off".
