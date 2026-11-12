# Security policy — Suliko IDE public CI and experimental plugins

**Status:** pre-release test infrastructure; **not** a certified secure product, public beta, or supported production distribution. The public repository is a mirror of reviewed GitLab source. BB upstream core and Suliko Remote are separate projects; this policy does not authorize any change or disclosure to them.

## How to report a vulnerability

Please **do not** publish exploits, working credentials, private tokens, sensitive logs, account information, security test fixtures with real customer data, or undisclosed vulnerability details in a public GitHub issue, pull request, discussion or comment.

Use the repository's GitHub **Security → Report a vulnerability** interface *if the maintainer has enabled private vulnerability reporting*. If that interface is not available, open a public issue containing **only** the neutral title "Private security contact requested" and no technical vulnerability details, screenshots, personal information or proof of concept; a maintainer should arrange an authorized private channel before receiving the details. We do not claim that private reporting is currently enabled, guarantee a response deadline, or offer a bounty.

For ordinary bugs that contain no sensitive security details, use a public GitHub issue and a minimal **synthetic** reproduction. Never post source tokens, unredacted support bundles, private project URLs or user files.

## Scope

The scope includes *only* original code in `plugins/suliko-hello`, `plugins/suliko-remote-panel`, public CI scripts/workflows, public docs and configuration in this repository. It does not include attacks on other people's systems, BB upstream, host operating systems, Suliko Remote services or third-party providers. Do not perform intrusive testing, scan other users' deployments, exfiltrate data, or disrupt public services.

## Support and response

This repo is experimental. There are no published supported production versions and no response-time guarantee. On verified findings we will restrict access to sensitive detail, record a private audit item, investigate reproducibility on synthetic fixtures, implement fixes without disabling existing tests, and rerun exact-head CI. A green automated scan is **not** proof of absence of vulnerabilities.

The current release pin is BB `desktop-v0.49.0` / reviewed SDK `0.6.132`, only for compatibility testing; it is not a promise of ongoing compatibility or an endorsement by BB maintainers. Do not bypass OS security warnings or run untrusted installer files.

## Disclosure

We follow coordinated disclosure in principle but cannot promise a fixed embargo, bounty, or legal safe-harbor beyond applicable law. Do not disclose third-party vulnerabilities externally on behalf of maintainers without appropriate authorization; coordinate with upstream maintainers through their official published channels.

**No email address, contact identity or secret is included in this policy.**