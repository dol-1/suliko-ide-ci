# Installing — current status

**No complete Suliko one-command installer is released.** Do not use experimental scripts as a production setup.

1. Use the [official BB release page](https://github.com/get-bb/bb/releases/tag/desktop-v0.49.0) for version 0.49.0. BB supports macOS arm64 desktop, and Windows x64/Linux x86_64 desktop as **alpha** packages, with limitations described in [upstream README](https://github.com/get-bb/bb/blob/desktop-v0.49.0/README.md). Windows desktop requires Git for Windows. Intel Macs can use the upstream `npx bb-app` fallback.
2. The public [Suliko setup preflight scripts](https://github.com/dol-1/suliko-ide-ci/tree/main/scripts) are **preview-only**, when available: `suliko-setup.sh --dry-run` or PowerShell `suliko-setup.ps1 -DryRun`. Optional verified downloads check a pinned SHA-256 and **never execute or install** downloaded assets. The scripts are under active CI testing; do not interpret a passing dry-run as an installed BB.
3. A real automated hardened-profile installer and marketplace setup require additional independent checks. Until this gate passes, do not turn on a remote-access endpoint or handle real private customer data.

## Windows: CLI only via WSL2; native GUI (D-174)

The pinned [official BB 0.49.0 bb-app documentation](https://github.com/get-bb/bb/blob/desktop-v0.49.0/packages/bb-app/README.md) supports **Windows CLI only inside Ubuntu WSL2**, using Linux paths; native PowerShell `bb project create` is not promised. The **official Windows Desktop GUI runs natively**, and isolated public CI previously verified a real installed `bb.exe` displaying Suliko Hello. D-174's integrated one-command installed GUI/SEC-02/loopback/safe-uninstall acceptance **has now passed isolated public CI on all three operating systems**, both [exact source 43743127349](https://github.com/dol-1/suliko-ide-ci/actions/runs/43743127349) and [merged main 43743593613](https://github.com/dol-1/suliko-ide-ci/actions/runs/43743593613). This **does not constitute a published installer, publisher signature, or independent security approval**.

The Windows installer is still **NotSigned**; SHA-256 does not replace publisher signing. No immutable RC tag, public beta, or independent SEC-04 sign-off has been issued. Do not run experimental setup scripts on personal or production computers.

[First steps](first-steps.en.md) · [Troubleshooting](troubleshooting.en.md)

**Windows trust warning (BB 0.49.0):** The official pinned Windows x64 installer has been SHA-256-verified against the official release digest, but a free Windows CI runner reported Authenticode **NotSigned**. Upstream states builds without a Windows signing certificate are unsigned and may trigger SmartScreen. SHA-256 authenticates correspondence to the reviewed release digest; it does **not** establish the publisher's code-signing identity. Following Claude's narrowly reviewed the approved D-090 trust boundary, a **separate disposable user-only Windows CI smoke** permits this exact official SHA-256-pinned `NotSigned` binary without treating it as a signed publisher identity: [GH Windows run 43550483976](https://github.com/dol-1/suliko-ide-ci/actions/runs/43550483976) completed SUCCESS for NSIS `/S` per-user install, 15-second GUI liveness and owned-file uninstall. A [later disposable public Windows-2022 run 43563716016](https://github.com/dol-1/suliko-ide-ci/actions/runs/43563716016) additionally verified an **actual official installed Windows Electron `bb.exe` displaying the Suliko Hello panel**, plus a *separate but same-run pinned-stock-source CLI* with loopback SEC-02 and Hello enabled; it does not prove a complete end-user installer. [Newer official installed Windows-2025 run 43569975316](https://github.com/dol-1/suliko-ide-ci/actions/runs/43569975316) also completed SUCCESS: unchanged pinned BB source compiled with a CI-temporary VS2026-compatible toolchain; the original `NotSigned` SHA-pinned installer genuinely displayed Hello in the installed `bb.exe`, while a separate same-job source CLI verified loopback SEC-02/Hello, followed by user-scoped uninstall under 900s. **The integrated one-command installation now passes synthetic three-OS CI only**, including genuine installed Windows official GUI and user-data-preserving uninstall ([exact main 43743593613](https://github.com/dol-1/suliko-ide-ci/actions/runs/43743593613)). **No end-user release is approved**: official Windows publisher signing, immutable marketplace RC tag, independent SEC-04 review and public beta permission remain absent. Do not bypass SmartScreen or interpret CI success as a general installation endorsement. See the [upstream Windows packaging explanation](https://github.com/get-bb/bb/blob/desktop-v0.49.0/apps/desktop/README.md).

## Tested platform evidence, not a released installer

The following are **separate disposable GitHub-hosted CI experiments**, not instructions for installing Suliko on your own computer:

| Platform | What has been observed | Still missing |
| --- | --- | --- |
| Linux x86_64 | [Official SHA-verified AppImage with genuine installed Electron Hello GUI panel](https://github.com/dol-1/suliko-ide-ci/actions/runs/43570384603) passed in an unprivileged disposable home, with 15-second liveness, own-file cleanup under 900s and separate same-run pinned-source CLI live SEC-02/Hello. | One-command setup is verified **only in synthetic 3-OS CI** ([D174 main](https://github.com/dol-1/suliko-ide-ci/actions/runs/43743593613)); public release, immutable RC tag and independent SEC04 remain unapproved |
| macOS Apple Silicon | [Official SHA-pinned signed DMG installed `bb.app` Hello GUI](https://github.com/dol-1/suliko-ide-ci/actions/runs/43571275903) passed in a disposable standard macOS-15 arm64 CI home: native `codesign --verify --deep --strict` **and** `spctl --assess --type execute` Gatekeeper checks (no explicit quarantine discard), genuine Hello Electron panel, 15-second liveness, separate same-run stock CLI live loopback SEC-02/Hello, user-owned cleanup under 900s. | One-command setup tested only in synthetic CI; immutable RC tag, independently reviewed release trust and notarization still unapproved |
| Windows x64 | Official SHA-pinned **`NotSigned`** NSIS installed non-admin on [free `windows-2025` run 43569975316](https://github.com/dol-1/suliko-ide-ci/actions/runs/43569975316), genuine installed `bb.exe` Hello GUI; same-job separate source CLI SEC-02/Hello, 15-second liveness and user-scoped uninstall under 900s. CI-only pinned native toolchain, upstream BB unchanged. | Publisher signing, immutable RC tag, public installer release and independent security review unapproved; actual integrated 3OS CI is GREEN only |

### D141 experimental one-entry native stage — CI only, not public setup

New `--install` / `--uninstall` (Linux/macOS) and explicit `-Install -AllowUnsignedVerified` / `-Uninstall` (Windows) entries now exist, **but are not released for real users**. Fresh disposable native CI success: [Windows-2025 43610379841](https://github.com/dol-1/suliko-ide-ci/actions/runs/43610379841) official fixed-SHA256 **NotSigned** user NSIS; [Linux 43611754307](https://github.com/dol-1/suliko-ide-ci/actions/runs/43611754307) verified user AppImage stage; [macOS 43612704684](https://github.com/dol-1/suliko-ide-ci/actions/runs/43612704684) official signed DMG user app, preserved quarantine, mandatory `codesign` and Gatekeeper `spctl`. All retained native installed GUI Hello and cleanup under 900s in these specific runner jobs.

**Current scope (supersedes the historical D141 partial integration):** [D174 merged-main run 43743593613](https://github.com/dol-1/suliko-ide-ci/actions/runs/43743593613) proves one-command installation with genuine official Desktop GUI, same user-scoped CLI/own Hello plugin, strict hardened loopback SEC-02 and protected-data-preserving uninstall in **synthetic free public CI** on all three OSes. A released installer, immutable tagged RC marketplace, Windows publisher signature, independently signed SEC-04 and public beta are **NOT** established. Do not run experimental install modes on personal or production devices.

A CI job marked GREEN for **diagnostic inspection** must never be interpreted as an approved installation. The four beta gates, including three-platform setup and a live docs site, are not all met. Do not run unreleased Suliko scripts on production systems.

For provider configuration, use BB's official settings interface rather than posting key values anywhere. [Troubleshooting](troubleshooting.en.md) and [FAQ](faq.en.md) cover safe support requests.

## Copyable CI-only preview commands (not an installer)

These commands are executed verbatim on disposable GitHub Actions Windows/macOS/Linux runners by the D-190 docs-as-test check. They only print preflight details; do **not** install a package, enable services or bypass Windows publisher trust. Run them only in a checked-out synthetic CI repository, **not** on personal or production computers. The native Windows Desktop GUI path is separately covered by the strict D-165 3-OS CI; the BB CLI on Windows remains **Ubuntu WSL2 only**, never native PowerShell.

<!-- D190:POSIX -->
```bash
bash scripts/suliko-setup.sh --dry-run
```

<!-- D190:WINDOWS -->
```powershell
pwsh -NoProfile -NonInteractive -File scripts/suliko-setup.ps1 -DryRun
```

The CI also reads PowerShell `--help` and refuses any output missing `WSL2`, `GUI` or `NotSigned`. Success is a **synthetic preview**, not a publisher signature, released RC tag or SEC-04 approval.

## D218 — RC tag native 3OS install commands, restricted to reviewed disposable CI

**Source checkpoint, not public beta/install advice:** immutable `suliko-hello/v0.1.0-rc.1` resolves to reviewed source commit `1c7470934ab694ce69ac92e70de300d6f6c50743`. The following literal commands are **CI fixture commands only**. `D218_CANDIDATE_PATH` is an isolated GitHub-runner-local file produced by independent same-tag candidate builders and verified against SHA-256 `8ca5634595b0ed8d3f26719163dc63126a2aea92dff59f529bcd55b712f8af6a`; it is **not** a file users are asked to download. The test uses a temporary owned home on Ubuntu 24.04/macOS 15/Windows 2025, validates the genuine installed GUI/Hello, then uninstalls while preserving user data. Do not run on personal/production devices; Windows official publisher status remains **NotSigned** and BB CLI on Windows requires **WSL2**, while the Desktop GUI is native Windows. Remote remains mock-only.

Linux/macOS (Ubuntu 24.04, macOS 15; execute from pinned tag checkout only):

```bash
bash scripts/suliko-setup.sh --install --plugin-sha 8ca5634595b0ed8d3f26719163dc63126a2aea92dff59f529bcd55b712f8af6a --candidate-file "$D218_CANDIDATE_PATH"
bash scripts/suliko-setup.sh --uninstall
```

Windows 2025 (execute only in isolated non-admin public runner against verified **NotSigned** official BB; never bypass SmartScreen on personal devices):

```powershell
pwsh -NoProfile -NonInteractive -File scripts/suliko-setup.ps1 -Install -AllowUnsignedVerified -PluginSha 8ca5634595b0ed8d3f26719163dc63126a2aea92dff59f529bcd55b712f8af6a -CandidateFile $env:D218_CANDIDATE_PATH
pwsh -NoProfile -NonInteractive -File scripts/suliko-setup.ps1 -Uninstall
```

The D218 regression compares these exact KA/EN commands with the immutable tag's own `scripts/d165-native-one-command.mjs` argv, then actually runs the tag's installer and safe uninstall on all three native runners; the result is NOT a published signed installer, access to Remote, or pilot invitation.


[Windows NotSigned and safe SHA-256 verification (no security bypass)](windows-trust.en.md).
