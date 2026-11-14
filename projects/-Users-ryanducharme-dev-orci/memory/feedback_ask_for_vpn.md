---
name: ask-for-vpn
description: "When a question or validation needs dev/stage RDS (or anything else behind the AWS VPN), ask Ryan to connect instead of reporting it as unverified"
metadata:
  node_type: memory
  type: feedback
  originSessionId: fe938377-464d-4fef-812a-419d58f07f61
  modified: 2026-11-13T15:45:03.123Z
---

When answering a question or validating something needs the AWS VPN (dev/stage RDS time out without it), ask Ryan to connect to the VPN and then run the check. Do not carry on and report the point as "unverified, needs VPN".

**Why:** Ryan said on 2026-11-13, after I left the dev feature-flag history unchecked across several replies: "always ask for me to connect to VPN if you need it to answer a question or validate or whatever."

**How to apply:** The moment an RDS connection times out or a check is known to need VPN, say so in one line and ask. Keep working on whatever does not depend on it. Related: [[query-rds-dev-secret-gap]], [[pushed-alert-tests-fail-together]].
