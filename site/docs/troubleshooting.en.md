# Troubleshooting (non-sensitive)

- **Install not verified:** confirm OS/CPU and official BB release; do not run an unverified binary. Windows/Linux desktop builds are still marked alpha by upstream.
- **Server unreachable:** check that BB is locally started and loopback-only; do **not** open firewall ports or disable protections as a shortcut.
- **Plugin panel missing:** the Suliko Hello/Remote panels are under test. Do not assume installation or enabled state; current full 7×2 parity has failures.
- **Provider unavailable:** check whether the provider is configured in its **official** settings, but never paste tokens into a GitHub issue.
- **Remote unknown outcome:** verify in the authorized Remote interface; a missing receipt is **not success**.

Use [pilot feedback](pilot.en.md) for a generic, sanitized report. The planned `suliko doctor` support bundle is a **synthetic preview**, not a finished live diagnostic tool.
