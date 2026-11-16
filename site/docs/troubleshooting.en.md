# Troubleshooting (non-sensitive)

- **Install not verified:** confirm OS/CPU and official BB release; do not run an unverified binary. Windows/Linux desktop builds are still marked alpha by upstream.
- **Server unreachable:** check that BB is locally started and loopback-only; do **not** open firewall ports or disable protections as a shortcut.
- **Plugin panel missing:** the Suliko Hello/Remote panels are under test. Do not assume installation or enabled state; current full 7×2 parity has failures.
- **Provider unavailable:** check whether the provider is configured in its **official** settings, but never paste tokens into a GitHub issue.
- **Remote unknown outcome:** verify in the authorized Remote interface; a missing receipt is **not success**.

Use [pilot feedback](pilot.en.md) for a generic, sanitized report. The planned `suliko doctor` support bundle is a **synthetic preview**, not a finished live diagnostic tool.

## Doctor / support bundle status

The public `suliko-doctor` experiment validates a **fixed-schema synthetic** report and rejects test tokens, private paths and email-shaped values. It is **not** a production diagnostic for your own machine, and a locally gathered log is not automatically safe to publish.

To report an issue, provide only the OS/CPU family, the BB release number, the affected feature and a general symptom. Do not attach raw logs, credentials, private repository paths, unredacted screenshots or Remote device identifiers. Use [pilot feedback](pilot.en.md) only for non-sensitive information. Unknown Remote job outcomes must be checked on the authorized Remote service; do not repeat write operations to see if they succeeded.

See the [FAQ](faq.en.md) for support and setup expectations.


## D198 live doctor: read-only, owned CLI (not yet a released tool)

The experimental `node scripts/suliko-doctor.mjs --live [--bundle NEWFILE.json]` checks **only** an existing user-owned BB 0.49.0 CLI, its local plugin-list metadata, current loopback TCP listeners and explicitly hardened runtime environment. It does not contact Suliko Remote or read user project files or API key values. It recognizes whether a **provider key environment-variable name** exists; this does **not** verify secrets in BB's own credential store. Unverifiable or disconnected live state is a nonzero `review-required`, never a false green.

Optional output uses an **exclusively new** redacted JSON bundle (`wx`, mode `0600` on Unix); it refuses overwriting an existing path and emits no raw BB logs, credentials, hostnames or private paths. The earlier `--fixture` mode remains **synthetic** and is not a substitute for `--live`. Tests exercise the installed native BB CI setup on all three operating systems; this is not a published end-user installer, private support facility or public beta. Do not upload private logs or circumvent Windows publisher trust warnings.
