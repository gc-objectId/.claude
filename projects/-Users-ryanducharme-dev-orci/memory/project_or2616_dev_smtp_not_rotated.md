---
name: or2616-dev-smtp-not-rotated
description: "OR-2616 dev SMTP move — relocation to secrets[] done, rotation NOT done; original exposure still live"
metadata: 
  node_type: memory
  type: project
  originSessionId: 97535106-eba6-45d2-8786-69e9fa59642a
  modified: 2026-07-31T21:28:24.756Z
---

OR-2616 validated 2026-07-31, left in **Ready for Testing** (not deploy-ready). The relocation half shipped via guided-infrastructure PR #105 (`secret-parity-dev`, merged 2026-07-24, applied 2026-07-20): dev's `spring.mail.password` moved out of plaintext `JVM_FLAGS` into a `SPRING_MAIL_PASSWORD` `secrets[]` entry, stage parity confirmed, no TF drift.

The rotation half was skipped. `smtp_password` hashes identically across `AWSCURRENT` and `AWSPREVIOUS` on `dev/guidedor`, and `AWSPREVIOUS` predates the move — so the value is unchanged from the plaintext era, and it still authenticates to SES. Pre-477 task-def revisions remain describable (ACTIVE *and* INACTIVE) with the 44-char plaintext intact, readable with an ordinary developer IAM user. `application-aws-dev.yml:69` still commits the SES username (an AWS access key ID, there since 2024-11-18); stage `:74` and prod `:76` do the same.

**Why:** relocating to `secrets[]` only stops *future* exposure. Rotation is the step that invalidates what already leaked into task defs and S3 Terraform state — so a "moved to secrets" ticket is not done until the credential is rotated.

**How to apply:** when validating any secret-relocation ticket, hash-compare secret versions to prove rotation rather than assuming it, and check whether old task-def revisions still expose the value. Scan old ECS revisions for the plaintext as a real can-it-fail red instead of a synthetic flip. Related: [[query-rds-dev-secret-gap]].
