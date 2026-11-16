# D214 — Pilot support runbook (KA/EN response categories; NOT SENT)

**Status: DRAFT, NOT A LIVE SUPPORT SERVICE.** Source: [Claude #88 D214](https://gitlab.com/dol-1-group/suliko-ide/-/issues/88), [D196 response templates](../pilot/D196-TROUBLESHOOTING-REPLIES.md), [D208 first-15-min kit](../pilot/D208-OWNER-FREE-15MIN-KIT.md), and [PILOT-01 #27](https://gitlab.com/dol-1-group/suliko-ide/-/issues/27). The SEC-04 scope-A acceptance is not approval for open beta, unsupervised installer distribution, actual Remote access or pilot outreach. No participant has been enrolled, contacted or supported by this draft.

## Gate before any support communication

1. Require a separately approved pilot/release GO and owner-approved contact channel; no automatic replies, public signup submissions, outbound messages or real-user tests are authorized here.
2. Keep BB pinned to reviewed 0.49.0; use only the published and checksum-reviewed RC source, not a floating install URL. Windows executable remains **NotSigned**: explain SmartScreen and SHA-256 trust; **never bypass or disable protection**. Windows CLI instructions require WSL2.
3. The actual Remote service is **not connected** by the public synthetic/mock demo. An approval mock is not real user authorization. No production device, owner machine or Remote endpoint is touched by these procedures.
4. All support is category-only by default. GitHub issues are **PUBLIC** even when closed; don't request names, ages, emails, phone numbers, addresses, access tokens, provider secrets, home paths, IPs, device IDs, private screenshots, project files, logs or live diagnostic bundles.

## Triage and deterministic next action

| Category | Safe observable report | Operator response, using D196 KA/EN templates | Stop / escalation |
| --- | --- | --- | --- |
| Version/provenance | `version-mismatch` or `unknown-version` | Refer to signed-off release/checksum and pinned BB 0.49.0; never tell users to install unknown builds | Halt setup until compatibility is independently verified |
| Loopback/SEC02 | `listener-policy` | Explain local-only loopback without asking for a real IP or router screenshot | Halt, do not expose ports or change firewall for reachability |
| Hello/plugin state | `hello-absent` or `plugin-state-mismatch` | Use approved product instructions; don't force-enable an unreviewed plugin | Stop until ephemeral hosted native 3OS proof is green |
| Provider key | `key-presence-false` only | Explain that the diagnostic is presence-only and no credential is required in public feedback | Never paste or transmit keys, partial keys or secret values |
| Doctor bundle/redaction | `bundle-redaction` or `doctor-unavailable` | Describe `suliko doctor --live` read-only, schema-limited behavior only in an approved environment | Do not upload bundle publicly; no private destination exists yet |
| Windows trust/CLI | `publisher-trust` or `wsl2-cli` | Explain NotSigned/SmartScreen without a bypass and WSL2 CLI caveat | Stop on security warnings rather than circumvent protection |
| First-task/UX feedback | `setup-friction`, `mock-task-incomplete` | Ask only for optional generic selected categories, not reproduction files | Preserve unknown outcomes as unknown, never guess a successful install |
| Real Remote/permission request | `remote-not-available` | Clarify that the public experience is synthetic/mock; no live Remote authority | Requires a separate authenticated product/security gate and owner GO |

## Priority scheme and SLA proposal (NOT A PROMISE)

- **P0 — Security or privacy boundary:** suspected secret disclosure, non-loopback exposure, a request to bypass protection, or unintended actual Remote access. Suspend any affected experimental flow and escalate only through a separately approved private security process; do **not** ask for public evidence. **Proposed** internal review within one business day after a valid private report.
- **P1 — Installation or onboarding stop:** verified-version mismatch, inability to complete synthetic Hello/doctor, unsafe uninstall uncertainty. **Proposed** internal acknowledgement within two business days after an approved support channel exists; don't promise a patch or release date.
- **P2 — Usability and docs:** copy translation, setup friction, optional feedback. **Proposed** weekly triage and prioritized documentation changes.
- No support hours, staffing, queues, response SLAs or participant agreement exist yet. These targets are planning hypotheses, **not guaranteed service levels**.

## Doctor data and safe handling

The newer read-only `suliko doctor --live --bundle NEWFILE.json` has an allowlisted, redact-first contract and exclusive file creation (`wx`, 0600), but **a green synthetic fixture does not certify a participant device**. Inspect the fixed schema locally within an approved isolated environment; never post a bundle to a public issue. There is presently no approved private attachment channel. Without one, receive only an error category, no file. Never request or retain provider tokens, credentials, paths, screenshots, personal data or unredacted crash logs. If an accidental exposure is suspected, stop public discussion and route through a separately approved security escalation path without repeating the material.

## Measurement and closure (only after separately authorized pilot)

Track only opt-in aggregate cohort counts: eligible consent denominator, success numerator, OS/mode, generic outcome and date. Zero or unknown denominator = **N/A**, never 100%. Time-to-first-task p50/p90 requires actual consented numeric timings, not bins; day-7 retention requires a defined eligible day-7 cohort. Real Remote approval outcomes remain **N/A** until authenticated Remote is explicitly in scope. No automated telemetry or personal issue scraping. Closure records the category, safe mitigation or explicit unknown, and source-reviewed public CI evidence, without a participant identifier.

## Review check before changing status

Compare KA/EN wording in D196 responses and D208 kit; verify actual Pages routes, native 3OS setup, D181 owner review gate, SEC02, digest/provenance and the owner authorization **again**. This document authorizes **no sending, enrollment, release, live Remote use or support inbox.**
