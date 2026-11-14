# Pilot metrics and feedback triage (synthetic template)

**SYNTHETIC EXAMPLE ONLY — NOT real participants, actual measurements, a running pilot or a beta readiness claim.** No hidden telemetry, SDK tracking or identifying personal information. A future two-week pilot requires explicit opt-in and a separate product/security GO first.

## Privacy-first collection

- Record only aggregated totals and randomly assigned short case IDs. Never copy names, email addresses, device identifiers, home paths, screenshots, provider keys, private code, IP addresses or free-text identifying details into a shared issue or public report.
- Ask for consent before any voluntary feedback. Only count eligible and consenting attempts; decline/withdrawal remains possible. Public GitHub issues can remain public after closure.
- Keep a private, access-limited original feedback source only as authorized; use aggregate categories in this template. Follow the approved 30-day linked-response retention protocol, then minimize/delete source links where permitted. Do not collect actual participant rows until the separate gate opens.
- Mark absent results **N/A**, not zero. Do not infer installation success from a downloaded package, signup, CI run or marketing interest.

## Blank two-week reporting table (replace N/A only with consented, verified aggregate data)

| Metric | Numerator | Denominator | Outcome | Verification |
| --- | ---: | ---: | --- | --- |
| Consent rate | N/A | N/A eligible invited | N/A | Opt-in record only |
| Setup success | N/A installed and verified | N/A attempted installs | N/A | Completed user-reported install + successful first launch |
| First-task success | N/A task completions | N/A consenting users who attempted a task | N/A | Optional respondent confirmation |
| Day-7 repeat use | N/A returners | N/A consenting users eligible for day 7 | N/A | Optional survey answer, not telemetry |
| Crash-free sessions | N/A verified sessions without crash | N/A voluntarily reported sessions | N/A | Aggregate survey, no logs |
| Feedback coverage | N/A respondents | N/A consenting pilot users | N/A | Opt-in questionnaire |
| High severity unresolved | N/A open P0/P1 | N/A triaged cases | N/A | Reviewed issue classification |

**Denominator rule:** numerator must be a subset of its exact denominator; denominator 0 or unknown → N/A, never 100%. Include date window, platform cohort and response/selection bias when publishing an aggregate.

## SYNTHETIC EXAMPLE — disposable fake numbers, not pilot evidence

| Fake cohort | Invited | Consented | Setup attempts | Verified setups | First-task attempts | Completed first tasks | Day-7 eligible | Returned |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| SYN-DEMO-01 | 6 | 5 | 4 | 3 | 3 | 2 | 5 | 1 |

Illustration only: synthetic setup success = **3/4 = 75%**, and synthetic first-task success = **2/3 ≈ 67%**. These are **not** observations or beta acceptance.

## Feedback triage (fake cases only)

| Case ID | Generic non-identifying symptom | Severity | State | Next action |
| --- | --- | --- | --- | --- |
| SYN-001 | Demo install prompt unclear | P2 | OPEN | Revise help wording, validate with synthetic fixture |
| SYN-002 | Disposable demo workspace fails to refresh | P2 | INVESTIGATING | Reproduce with pinned public sample and bounded logs |
| SYN-003 | Example text contains placeholder sensitive-looking content | P1 | TRIAGE | Privately review/redact before any public reproduction |

**Triage policy:** P0 immediate safety/data-loss blocker, P1 security/core unusable, P2 degraded behavior, P3 cosmetic/question. Do not publish reproduction secrets; for suspected security findings, use the private SEC-04 review ledger. Every case needs a reproducible *synthetic* scenario, owner/team, status and verified fix evidence. Public issues must not contain participant identities.

[Privacy](privacy.en.md) · [Pilot signup](pilot.en.md) · [Troubleshooting](troubleshooting.en.md)
