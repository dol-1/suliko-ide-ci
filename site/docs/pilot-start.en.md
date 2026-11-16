# Future pilot: first 15 minutes (not open yet)

**Pre-release, conditional guide only. Do not install Suliko IDE on a personal or production machine today.** The 15-minute plan is a *target*, not a measured installation time or an invitation. Real participation begins only after a separate owner/security GO. The official BB Windows package is **NotSigned**; never bypass operating-system publisher warnings. Windows BB CLI is supported only through **Ubuntu WSL2**; the GUI is native. **Remote** is a synthetic **mock**, not a live service.

## A voluntary, approved pilot session

1. **Minutes 0–3 — verify permission and prerequisites.** Confirm the pilot has actually been opened and the official reviewed BB 0.49.0 installer and immutable Suliko candidate have verified SHA-256 checksums. A checksum only identifies bytes; it is not a publisher signature. If the pilot is not approved, stop here.
2. **Minutes 3–8 — setup (only inside an authorized isolated environment).** Use the separately approved pinned single-command installer for your OS, not a guessed download or arbitrary shell URL. The [installation review guide](install.en.md) describes Windows GUI versus WSL2 and uninstall boundaries. Do not open network ports or disable Windows security.
3. **Minutes 8–11 — Hello first task.** In a disposable/public example project, open the installed **Suliko Hello** panel and record only whether the panel appeared and a benign test task completed (yes/no/unknown). Never provide secrets, real work documents, private screenshots or raw logs.
4. **Minutes 11–13 — Doctor, if supported by approved pilot build.** A reviewer may run `node scripts/suliko-doctor.mjs --live --bundle NEWFILE.json` in a previously verified *user-owned isolated* BB 0.49.0 environment. It is read-only, checks native loopback and a fixed plugin allowlist, and outputs a fixed-schema JSON bundle only to a **new file**. It can fail closed; `--fixture` is synthetic and must not be counted as a real machine check. A provider-variable *name* presence is not proof of actual credentials.
5. **Minutes 13–15 — optional feedback and clean exit.** Use the [privacy-minimal feedback checklist](pilot-feedback.en.md); report only generic outcome and optionally rough elapsed-time band. Stop or uninstall according to approved environment instructions; never remove another user's existing BB installation.

## Support bundle attachment policy

**Do not upload a doctor bundle to a public GitHub issue or send it to a participant.** The approved pilot reviewer must inspect the fixed-schema JSON for private identifiers, secrets, paths and unexpected fields before sharing it; only if an access-controlled **approved private support channel** is explicitly provided may a sanitized bundle be attached there. No such channel is offered by this pre-release guide. Otherwise submit only a generic status category; for failed `--live`, report `review-required` without raw diagnostic output.

[Feedback](pilot-feedback.en.md) · [Pilot interest (public)](pilot.en.md) · [Privacy](privacy.en.md) · [Troubleshooting](troubleshooting.en.md)
