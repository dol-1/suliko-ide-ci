# Installing — current status

**No complete Suliko one-command installer is released.** Do not use experimental scripts as a production setup.

1. Use the [official BB release page](https://github.com/get-bb/bb/releases/tag/desktop-v0.49.0) for version 0.49.0. BB supports macOS arm64 desktop, and Windows x64/Linux x86_64 desktop as **alpha** packages, with limitations described in [upstream README](https://github.com/get-bb/bb/blob/desktop-v0.49.0/README.md). Windows desktop requires Git for Windows. Intel Macs can use the upstream `npx bb-app` fallback.
2. The public [Suliko setup preflight scripts](https://github.com/dol-1/suliko-ide-ci/tree/main/scripts) are **preview-only**, when available: `suliko-setup.sh --dry-run` or PowerShell `suliko-setup.ps1 -DryRun`. Optional verified downloads check a pinned SHA-256 and **never execute or install** downloaded assets. The scripts are under active CI testing; do not interpret a passing dry-run as an installed BB.
3. A real automated hardened-profile installer and marketplace setup require additional independent checks. Until this gate passes, do not turn on a remote-access endpoint or handle real private customer data.

[First steps](first-steps.en.md) · [Troubleshooting](troubleshooting.en.md)

**Windows trust warning (BB 0.49.0):** The official pinned Windows x64 installer has been SHA-256-verified against the official release digest, but a free Windows CI runner reported Authenticode **NotSigned**. Upstream states builds without a Windows signing certificate are unsigned and may trigger SmartScreen. SHA-256 authenticates correspondence to the reviewed release digest; it does **not** establish the publisher's code-signing identity. Our signed-installer gate deliberately refuses execution, and Suliko's Windows automated install is **not approved**. Do not bypass SmartScreen or interpret a diagnostic GREEN run as an installation success. See the [upstream Windows packaging explanation](https://github.com/get-bb/bb/blob/desktop-v0.49.0/apps/desktop/README.md).

## Tested platform evidence, not a released installer

The following are **separate disposable GitHub-hosted CI experiments**, not instructions for installing Suliko on your own computer:

| Platform | What has been observed | Still missing |
| --- | --- | --- |
| Linux x86_64 | Official SHA-verified AppImage staged in a fresh unprivileged home, launched, and owned files removed. A separate real stock BB loopback profile disabled forbidden built-ins and enabled a local Hello plugin. | One released setup command, RC marketplace tag, packaged-plugin integration and full uninstall |
| macOS Apple Silicon | Official SHA-verified DMG read-only mounted, user-local app copied, macOS code signature checked, launched briefly and removed. | Live hardened profile, marketplace/plugin and complete setup command |
| Windows x64 | Official EXE SHA-256 matches the release digest, but hosted Windows reported **NotSigned**. | A reviewed publisher-trust policy and safe installed-plugin E2E; no installer was executed by the signed-execution test |

A CI job marked GREEN for **diagnostic inspection** must never be interpreted as an approved installation. The four beta gates, including three-platform setup and a live docs site, are not all met. Do not run unreleased Suliko scripts on production systems.

For provider configuration, use BB's official settings interface rather than posting key values anywhere. [Troubleshooting](troubleshooting.en.md) and [FAQ](faq.en.md) cover safe support requests.
