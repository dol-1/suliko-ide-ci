# BB upstream upgrade / continuity runbook (D210 / ARCH-01)

**No upstream BB core edits.** Reviewed pinned desktop release: **desktop-v0.49.0**, public [official release](https://github.com/get-bb/bb/releases/tag/desktop-v0.49.0) published 2026-11-06T20:54:14Z. Public GitHub official latest as independently queried 2026-11-16 is still desktop-v0.49.0. Repository API SPDX **MIT** at that check (recorded baseline; recheck every run).

## Daily read-only signal (max one scheduled UTC occurrence per day)

1. Public GitHub Actions workflow D210 reads upstream **releases/latest** and repository SPDX license using ephemeral READ-ONLY Actions token; uses strict stable-tag/version check and UTC published date. No write API or automatic issue/PR.
2. Every run stores a seven-day JSON + Markdown artifact. New release tag != pinned, SPDX != MIT, or latest release >=60 days old → mark NEEDS_REVIEW and produce a **GitLab issue DRAFT TEXT** inside artifact only, not a posted issue.
3. Owner requirement: a human creates a biweekly upstream review issue, or earlier on a release/security change, after reading the artifact and reviewing actual changelog. No automatic issue creation, no spam. On license change or 60-day gap propose separate BB continuity issue to owner.
4. Track upstream latest tag, exact changelog link, change type, breaking plugin SDK changes, security fixes with urgency, version comparison, minimal compatibility evidence; choose **bump / defer**. Never claim breaking SDK merely because semver drifts.

## Bump gates (separate proposed MR; never blind upgrades)

- Preserve get-bb/bb as read-only upstream: change only our plugin sources, lockfiles and owned configs, never BB core.
- Obtain immutable release tag/source SHA and inspect official license and security changelog manually; distinguish SPDX summary from actual license text, escalate uncertain claims.
- Run clean pinned and candidate SDK typecheck/plugin tests and negative allowed-ranges, specifically our own Hello and Remote mock.
- Run exact-head [D165 native one-command 3-OS](https://github.com/dol-1/suliko-ide-ci/actions/workflows/d165-e1-one-command-3os.yml), **QA 14/14** (Web/Desktop), **SEC02 loopback / disabled plugin**, **D166 two independent builders + equal candidate hash and verified OIDC attestation**. Then CodeQL/Semgrep/Gitleaks/D152, reviewer note BEFORE SHA-locked GitLab merge, postmain rerun.
- Windows official stock BB installer **NotSigned** remains a publisher-signature limitation; digest is not Authenticode. Windows CLI WSL2-only; do not disable OS security checks or request owner-machine testing.
- Approval to bump does not imply release, beta/pilot, live Remote or public user installation. Release/SEC04/owner phases are independent.

## Continuity and limits

At 60 days without a new stable official release or any verified change in license terms, prepare a private **BB continuity** finding with exact GitHub release URL, dates, current SPDX and statement of uncertainty. No automatic public communication. A schedule trigger does not make a source change safe by itself. No unapproved production integration.
