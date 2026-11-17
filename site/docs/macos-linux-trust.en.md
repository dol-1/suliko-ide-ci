# macOS and Linux trust checks — SHA-256, Gatekeeper and packages

**Source-only preview. Suliko IDE is not a released public beta.** This page is an informational check, not a download, installation invitation, or authorization to run a disputed package. The official BB desktop and Suliko Hello plugin archives are **different assets**, each requiring its own reviewed SHA-256.

## What a SHA-256 digest can and cannot prove

A 64-character SHA-256 hex digest can establish whether the bytes of an **already obtained file** match an independently trusted expected digest for **the same filename, platform, architecture and version**. Hash equality alone does **not** prove a publisher identity, notarization, trustworthiness, or suitability for release. If the expected digest is absent, the source is uncertain, the hash does not match, or a system warning appears: **stop and seek a verified release from the maintainer**. Never run the file merely because a checksum matches.

## macOS: read-only check and Gatekeeper

For an already obtained file, display its SHA-256 in Terminal **without opening or installing it**:

```sh
FILE='<path-to-existing-file>'
shasum -a 256 "$FILE"
```

**Gatekeeper** checks developer identity and, where applicable, Apple's notarization on downloaded applications. An alert that macOS cannot verify a developer or cannot check for malicious software is **not** a reason to disable or bypass security protections. Do not override Gatekeeper, clear quarantine, or suppress malware warnings. Use an approved, signed/notarized release only when publisher and source have been independently confirmed. **We do not claim that Suliko's macOS distribution is signed or notarized.**

Official references: [Apple — Safely open apps on your Mac](https://support.apple.com/en-us/102445) and [Apple Developer — Developer ID](https://developer.apple.com/developer-id/).

## Linux: read-only digest and distribution trust

For an already obtained archive or package, display the SHA-256 **without installing or executing the package**:

```sh
FILE='<path-to-existing-file>'
sha256sum "$FILE"
```

Check the **entire** digest against the verified independent digest published for exactly that Linux build and CPU architecture. On Linux, package-manager repository provenance and any publisher/package signatures matter independently of SHA-256. A digest does not grant permission to run scripts or install a package, and it does not replace repository or package-signature verification. Avoid piping fetched code to a shell.

## Scope and next reading

A reviewed **Suliko Hello rc.1 source archive** digest cannot substitute for any macOS installer, disk image, Linux AppImage, DEB, RPM or BB application digest. This guide uses no real machine, user data or Remote credentials. All installation and release decisions remain **NO-GO** until the independent security review, publisher signing and owner approval.

[Install status](install.en.md) · [Windows trust](windows-trust.en.md) · [Privacy](privacy.en.md) · [Troubleshooting](troubleshooting.en.md)
