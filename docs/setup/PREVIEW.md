# D-058 setup preview (not an installer)

This is a security-first **preflight only** for official BB [desktop-v0.49.0](https://github.com/get-bb/bb/releases/tag/desktop-v0.49.0). It does **not** run downloaded installers, configure providers, install Suliko plugins, modify BB user data, or create privileged accounts. No release or beta readiness is claimed.

On macOS Apple Silicon or Linux x86_64 use `bash scripts/suliko-setup.sh --dry-run`, `--download-verified` (network + official SHA-256 validation only), or `--uninstall` (only Suliko-managed download cache). On Windows x64 use `pwsh -File scripts/suliko-setup.ps1 -DryRun`, `-DownloadVerified`, or `-Uninstall`. Neither script silently invokes an executable or installs services. All modes run as current user, no sudo/admin.

Official BB README warns Windows and Linux desktop packages are **alpha**, native Windows requires Git for Windows, and Intel macOS uses the `npx bb-app` alternative; unsupported platforms fail closed here. The checksums are pinned to the asset digest data in the official release API. Checksums alone are not proof of publisher identity or code-signing verification.

The preflight CI covers dry-run, wrong-checksum rejection and safe cache cleanup on three OS runners. It is **not** an installation success test. Remaining E1 gates: supported unattended user-level install method, SEC-02 verifier on live installed instance, pinned marketplace/plugin setup, clean uninstall, 3-OS green test, 15-minute timing. Never run scripts from untrusted third-party URLs.
