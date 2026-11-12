# E9 D066 — installed Remote mock Web a11y, synthetic KA/EN scope

**Experiment, no live Remote.** The app-only plugin `plugins/suliko-remote-panel` embeds offline static `demoRemote` data. This Linux-only free public CI test builds exact stock BB `desktop-v0.49.0`, installs the own mock plugin into a newly created loopback disposable server, and inspects its actually rendered Web panel in English and Georgian simulated browser locales.

The CI-only pinned `@axe-core/playwright@4.14.0` license is MPL-2.0 (development test dependency only). The test fails on any detected **critical** axe violation, any horizontal clipping or a wrong exact translated section accessible label; it reports serious/incomplete separately. The mock approval link must be the intentionally unresolvable `remote.example.invalid` HTTPS host with safe new-tab attributes and **no approval button** inside IDE. Test never clicks that link or performs Remote write. No raw DOM, screenshot, user information, or tokens are logged or uploaded.

**Not proven:** desktop parity, real Remote authorization, real external secure-page approval, persistence of BB's locale setting, all keyboard/color-contrast WCAG checks, multi-OS visual regression, true 30-min soak, a user installation, or release readiness. Those remain independent open E9 and QA gates.

Source: [E9 #53](https://gitlab.com/dol-1-group/suliko-ide/-/work_items/53), [Claude #36](https://gitlab.com/dol-1-group/suliko-ide/-/work_items/36), own Remote mock panel and i18n source, manual v1.10.

**Test adapter prerequisite:** the exact stock BB `bb plugin install` command requires a `bb.server` path; the first actual [GH run 43272863954](https://github.com/dol-1/suliko-ide-ci/actions/runs/43272863954) failed at manifest validation `bb.server: expected string, got undefined` *before rendering*. The own plugin now supplies a typed no-op `server.ts` and `bb.server` manifest entry solely to satisfy BB's public plugin installation contract. It registers no RPC, settings, services or approvals and does **not** alter BB core or connect to Suliko Remote. This does not convert the demo into a real service integration.
