# Installing — current status

**No complete Suliko one-command installer is released.** Do not use experimental scripts as a production setup.

1. Use the [official BB release page](https://github.com/get-bb/bb/releases/tag/desktop-v0.49.0) for version 0.49.0. BB supports macOS arm64 desktop, and Windows x64/Linux x86_64 desktop as **alpha** packages, with limitations described in [upstream README](https://github.com/get-bb/bb/blob/desktop-v0.49.0/README.md). Windows desktop requires Git for Windows. Intel Macs can use the upstream `npx bb-app` fallback.
2. The public [Suliko setup preflight scripts](https://github.com/dol-1/suliko-ide-ci/tree/main/scripts) are **preview-only**, when available: `suliko-setup.sh --dry-run` or PowerShell `suliko-setup.ps1 -DryRun`. Optional verified downloads check a pinned SHA-256 and **never execute or install** downloaded assets. The scripts are under active CI testing; do not interpret a passing dry-run as an installed BB.
3. A real automated hardened-profile installer and marketplace setup require additional independent checks. Until this gate passes, do not turn on a remote-access endpoint or handle real private customer data.

[First steps](first-steps.en.md) · [Troubleshooting](troubleshooting.en.md)
