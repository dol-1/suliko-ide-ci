# Contributing (public CI mirror)

This repository contains **experimental** Suliko IDE compatibility plugins, synthetic test fixtures and public CI scripts. Do not submit changes to BB core or Suliko Remote. The private planning repository, internal security findings, customer data and credentials must never be copied here.

All proposed changes are reviewed upstream through GitLab; the public GitHub copy is a push mirror used for CI and visible tests, not an independently managed release source. An outside contributor can open a GitHub issue for non-sensitive feedback, but a public GitHub pull request is not a promise of automatic acceptance or merging.

## Code changes

- Keep changes in Suliko's own plugin/configuration surface; pin BB and public SDK versions. No root/admin escalation, external secret access, real user telemetry or auth bypass.
- Never weaken tests, use ordinary `continue-on-error` to conceal regressions, or add mutable third-party GitHub Action refs when an immutable SHA is available.
- Test with free public GitHub Actions standard runners only; never put credentials in fixtures, logs, artifacts, issue descriptions or support bundles.
- Before any public CI main merge, require the **exact source-head** GitHub Actions run to be completed with conclusion `success`. Record the verified run ID, head SHA and UTC completion timestamp **in the GitLab merge request before merging**. Green on an earlier commit, a skipped job, or an unverified mirrored SHA is not acceptance.
- All security findings should be reported privately according to [SECURITY.md](SECURITY.md). Leave the security gate red when the risk is unresolved.
- A successful SDK-level mock test does not prove Desktop/Web parity, a signed OS installer, a safe Remote approval operation, or a release.

## Release policy

No automatic publishing, `v*` release tags, marketplace public beta, real user deployments or official BB distribution. Any release is a separately authorized process after product, security, license and owner go/no-go gates.

## Licensing

No license grant is implied by the presence of a public Git mirror. Licensing and redistribution of Suliko-original code require an explicit approved project license. Third-party BB/dependency copyright notices remain governed by their respective upstream licenses.