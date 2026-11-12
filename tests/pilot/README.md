# D-067 — synthetic-only pilot metrics fixture

This public test directory contains **no participants or real survey responses**. Its `synthetic-empty.json` is a zero-row fixture used to ensure missing information produces `null` / **N/A**, not fabricated pilot success.

From a local repository checkout (Node 22.19.0 or newer):

```sh
node --test scripts/d067-pilot-metrics.test.mjs
node scripts/d067-pilot-metrics.mjs --synthetic-input tests/pilot/synthetic-empty.json
```

The CLI rejects any input without `synthetic: true`, unknown keys (including names, emails, participant IDs, raw logs, source paths, URLs and free-text notes), and inconsistent durations or Remote approval counts. It prints **aggregates only**; it does not store anything or send network requests. The assertion `synthetic: true` is a testing contract, **not proof** that a caller's data is anonymized: **never input real participant records to this CLI, and never upload such records to GitHub/GitLab CI or source control**.

Definitions follow the private `docs/pilot/PILOT-METRICS-PROTOCOL.md`: nearest-rank p50/p90 over completed installations/tasks, attempted/completed denominators separately, `missing` different from `no`, and Remote approval N/A unless synthetic authoritative eligible attempts are supplied. Reported counts are explicitly labeled **SYNTHETIC DEMONSTRATION ONLY**.

This cannot authorize recruitment, measure actual beta outcomes, demonstrate real consent/retention, or replace a privacy-reviewed, private real-pilot analysis process. No telemetry, external services, BB upstream changes or real Remote approvals are involved. Source: private GitLab E10 #54 and Claude E1–E10 #36.
