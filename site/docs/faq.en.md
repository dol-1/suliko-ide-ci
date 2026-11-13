# Frequently asked questions

**Is Suliko IDE a replacement for BB?** No. It builds own plugins, configuration and testable setup tooling around the unchanged upstream BB application.

**Can I install a finished beta now?** No. The current scripts and tests are experimental. Three-OS end-to-end setup, a verified RC marketplace install, full Desktop/Web parity, a reachable public documentation site and release acceptance are still being verified.

**Why does Windows show a warning?** The official BB 0.49.0 Windows x64 EXE has a verified release SHA-256 but currently reports Authenticode `NotSigned` in public CI. A matching hash does not establish a signed publisher. Do not bypass OS security warnings to test Suliko.

**Does Suliko ask for an API key?** No public signup or GitHub issue should ever contain API keys. BB's normal provider setup is independent; the unfinished Remote mock uses no live credentials.

**Can I approve Remote actions inside the IDE?** No. The Remote panel is read-only; authorization stays on the separate authenticated Remote service. An unknown outcome is neither approval nor success.

**What should I put in a support report?** Generic OS/CPU, release and a symptom only. See [troubleshooting](troubleshooting.en.md) and [privacy](privacy.en.md).

**Can I join a pilot?** The [public signup form](pilot.en.md) is optional, and signing up is not a beta invitation or guaranteed access.
