# D210 — BB upstream source-only upgrade review (no automatic bump)

**Pinned BB Desktop: 0.49.0**, canonical upstream [get-bb/bb](https://github.com/get-bb/bb). Latest official stable at the reviewed 2026-11-16 checkpoint: [desktop-v0.49.0](https://github.com/get-bb/bb/releases/tag/desktop-v0.49.0), published 2026-11-06 20:54:14Z. Nightly, `desktop-latest`, draft and prerelease tags are **not approved stable upgrade candidates**. Source: official public GitHub releases API.

This daily **one-run-per-day** read-only public CI check obtains the official GitHub stable release metadata. When upstream stable is newer than our pin, it writes `out/d210/issue-draft.md` with version, URL and verification checklist. It **does not create** GitLab/GitHub issues, bump the pin, edit BB upstream source, install software, release anything or contact users. The baseline check always writes a bounded `status.md` artifact. Invalid tags, hosts or prerelease data fail closed rather than inventing a release.

## Change review checklist

1. Confirm official exact upstream stable tag and published timestamp independently; identify plugin SDK migrations/breaking API contracts, security advisories, platform changelog. Current baseline reviewed in [private upstream issue #29](https://gitlab.com/dol-1-group/suliko-ide/-/issues/29), including plugin invalidation and host-path migration risk.
2. Prepare a **separate GitLab MR** for a proposed pinned version bump (never modify upstream `get-bb/bb`, nor any read-only mirror, nor auto-bump). Include exact asset SHA-256, provenance, license comparison, desktop/CLI path and marketplace/SDK test impacts. Never replace checksum by floating download.
3. On exact candidate head and subsequently canonical main, require **D165** true one-command GUI/CLI setup + uninstall on real ephemeral hosted Windows/macOS/Linux; **SEC02** loopback-only hardening; **D171** J01–J07 Web/Desktop strict **14/14**; **D166** two independently reproduced Hello candidate archives, SBOM and OIDC attestation; D173 plugin SDK compatibility and CodeQL/Semgrep/Gitleaks/D152. Check every affected workflow path-filter, not merely a convenient subset.
4. Treat failing tests, non-verified publisher signing or incompatible plugin SDK as **WAIT**. Never bypass Windows NotSigned / SmartScreen, open the local server to non-loopback or substitute synthetic Remote/mock for live authorization. Independent security review remains separate.
5. If a new version has a security fix relevant to our exact dependencies, prioritize a scoped review and explicit remediation issue; do not claim any vulnerability or fix without evidence. Promotion and public beta are separately approved.

## Continuity

Per [ARCH-01 owner direction 2026-11-11](https://gitlab.com/dol-1-group/suliko-ide/-/issues/29), every two weeks or upon a new upstream release prepare versioned review content; after 60 days without a stable release or license change, draft **BB continuity** issue separately. Daily check is an *early warning* and never an automated owner alert. This workflow records release metadata only; more detailed license/60-day checks require a separately reviewed gate and no speculative conclusions.
