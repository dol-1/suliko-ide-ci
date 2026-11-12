# SPIKE-02 3-OS packaged smoke (staged / not executed)

**Source:** BB [`desktop-v0.49.0`](https://github.com/get-bb/bb/tree/desktop-v0.49.0), Memo D-014, manual §2/§7–§8, [issue #9](https://gitlab.com/dol-1-group/suliko-ide/-/work_items/9).

This directory is a **GitLab staging copy**, not an active GitHub workflow. Once the owner-provisioned `dol-1/suliko-ide-ci` public repository exists, install `.github/workflows/spike02-packaged.yml` **in that GitHub repository's root**. This repository's BB source is never modified or copied to GitHub; Actions checkout fetches pinned upstream tag in a temporary runner.

## Source and artifact integrity (staging; NOT execution evidence)

- The pinned GitHub upstream release tag `desktop-v0.49.0` was resolved via connected GitHub `fetch_commit` to [commit `7b26cae79ec978fafd0a5db0e8517e94f12eb8f4`](https://github.com/get-bb/bb/commit/7b26cae79ec978fafd0a5db0e8517e94f12eb8f4); separate `compare_commits` reported the tag and SHA identical (0 ahead/behind). Each runner now verifies its checked-out `git rev-parse HEAD` equals this fixed SHA before proceeding. An upstream moved tag fails closed, not silently selecting new source.
- Installer hash calculation now streams binary bytes in fixed-size chunks instead of calling `readFileSync` on each potentially large DMG/AppImage/EXE. It still reports the full-file SHA-256 and byte length without uploading release installers.
- These changes are source-only. **No workflow has run** and no 3-OS package, smoke, security or reproducibility test has passed as a result of staging.

## Planned checks (currently all UNVERIFIED)

| CI runner | Package | Evidence expected |
| --- | --- | --- |
| `macos-15` arm64 | Unsigned DMG + ZIP; `--publish never` | Package SHA-256, stock `smoke:packaged`, real BB boot, 30-second loopback dwell |
| `ubuntu-24.04` x64 | Unsigned AppImage | Package SHA-256, Electron smoke in `xvfb-run`, real BB boot, 30-second loopback dwell |
| `windows-latest` x64 | Unsigned NSIS | Package SHA-256, native Electron smoke, real BB boot, 30-second loopback dwell |
| Windows WSL2 | — | **NOT TESTED IN CI**; explicit separate manual gate |

**Package completeness gate:** BB's [pinned Electron Builder config](https://github.com/get-bb/bb/blob/desktop-v0.49.0/apps/desktop/electron-builder.config.json) declares **both** macOS `dmg` and `zip` on arm64. The artifact check now fails unless **both** file types exist and hashes them separately; Linux AppImage and Windows NSIS EXE are also mandatory. This is staged, not tested in a runner.

**Hardened-mode boundary:** The stock [`bb-app smoke:boot`](https://github.com/get-bb/bb/blob/desktop-v0.49.0/packages/bb-app/scripts/smoke-boot.mjs) explicitly lists `connect` among expected **running** bundled plugins, whereas Suliko V1 requires `connect` **disabled** (manual §3). The stock smoke and separate 30-second real BB health dwell therefore verify **baseline packaging/startup only**. They **do not** prove Suliko SEC-02 disabled-plugin policy, no nonloopback reachability, owner-only Tailscale ACL, or private marketplace. Those gates remain tracked under [SEC-02 #7](https://gitlab.com/dol-1-group/suliko-ide/-/work_items/7), not satisfied by SPIKE-02.

**Important distinction:** BB's own `apps/desktop/scripts/smoke-packaged-app.mjs` checks Electron preload using a *mock* loopback server. It does **not** prove the real BB daemon stays up. We separately run upstream `bb-app` `smoke:boot` and a 30-second health dwell against an isolated real `127.0.0.1` process in runner-owned temp storage, with cleanup. No production host, privileged command, secret, live provider token, or public listener is needed.

**No release:** unsigned CI binaries are **not** approved desktop installers, no artifact binary is uploaded; only logs and SHA-256 manifests are retained. No tests, build or runner matrix have run. On failure, inspect logs, retry at most **three** separate attempts in authorized CI, then document blocker with `needs::claude` per manual §7. Do not weaken smoke tests.

**Runner source:** [GitHub Nov 2 macos-14 retirement](https://github.blog/changelog/2026-10-01-github-actions-macos-14-runner-image-retirement/) and [runner images](https://github.com/actions/runner-images). `macos-15` is the current Apple Silicon supported label; `macos-14` is retired.

**BB build references:** [desktop scripts](https://github.com/get-bb/bb/blob/desktop-v0.49.0/apps/desktop/package.json), [electron builder package formats](https://github.com/get-bb/bb/blob/desktop-v0.49.0/apps/desktop/electron-builder.config.json), [packaged smoke implementation](https://github.com/get-bb/bb/blob/desktop-v0.49.0/apps/desktop/scripts/smoke-packaged-app.mjs), and [real bb-app boot smoke](https://github.com/get-bb/bb/blob/desktop-v0.49.0/packages/bb-app/scripts/smoke-boot.mjs).

**Known limitations:** no GitHub repo yet; YAML/execution behavior unverified. `actions/checkout`, `actions/setup-node`, and `actions/upload-artifact` are pinned to GitHub-verified immutable commit SHAs (upload v4 resolves to [`ea165f8`](https://github.com/actions/upload-artifact/commit/ea165f8d65b6e75b540449e92b4886f43607fa02), verified via connected GitHub `fetch_commit` on 2026-11-11); macOS unsigned app runtime may be rejected by OS security and must be diagnosed without disabling security systemwide.