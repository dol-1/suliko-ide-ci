# Windows trust and SHA-256 — source-only guide

**Suliko IDE is not a released public beta.** This page documents a trust check; it does not invite installation or authorize an unsigned executable. Source: [official BB 0.49.0 release notes](https://github.com/get-bb/bb/releases/tag/desktop-v0.49.0) and our synthetic [CI evidence](https://github.com/dol-1/suliko-ide-ci/actions).

## What NotSigned and SmartScreen mean

The reviewed official Windows BB 0.49.0 NSIS package returned **NotSigned** from Authenticode in a disposable CI test. Windows **SmartScreen** may therefore warn about an unrecognized publisher. A matching **SHA-256** digest shows that the bytes match a separately reviewed exact-release digest; it is **not** a publisher signature, does not guarantee safety, and cannot authorize a release. Never disable security checks or bypass a SmartScreen warning to use unapproved Suliko software.

## Read-only local hash check (no execution)

For an **already obtained, trusted-source file** in an isolated, authorized evaluation, PowerShell can display its SHA-256 without running it:

```powershell
$File = '<path-to-already-downloaded-file>'
Get-FileHash -LiteralPath $File -Algorithm SHA256
```

Compare the full 64-hex result against the separately published and reviewed SHA-256 for **that exact asset and version**, using an independent trusted source. A mismatch, unavailable trusted expected digest, unclear provenance, or any trust warning means **stop**. Do not substitute the Suliko Hello plugin archive digest for the separate official Windows installer digest.

## Windows Desktop versus command-line

The native Windows **GUI** is distinct from the BB CLI. For pinned BB 0.49.0, **CLI on Windows requires Ubuntu WSL2** (Linux paths); native PowerShell `bb project create` is not a supported claim. Our test evidence is from disposable hosted Windows/macOS/Linux CI, not personal devices. Remote in public Suliko docs is synthetic/mock, not a live authorization service.

[Installation status](install.en.md) · [Troubleshooting](troubleshooting.en.md) · [Privacy](privacy.en.md)

**No real installer distribution, signing claim, owner outreach, live Remote connection or public beta GO is established by this guide.**
