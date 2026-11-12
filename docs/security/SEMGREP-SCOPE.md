# D-063 Semgrep narrow own-source security scan

Source: [E6 #48](https://gitlab.com/dol-1-group/suliko-ide/-/work_items/48), official [Semgrep v1.185.0](https://github.com/semgrep/semgrep/releases/tag/v1.185.0) and [security audit rules](https://semgrep.dev/p/security-audit).

The CI runner installs pinned Semgrep from PyPI into a disposable venv, scans public CI's own Hello and Remote mock plugin code and scripts with security-audit and JavaScript rule registries. Metrics disabled. Structured results and raw stdout/stderr are ephemeral; only sanitized finding/error counts appear in logs. Nonzero scan return **fails**; reviewers must independently analyze any findings via a restricted workflow, not paste potential secret-matched source into public issues.

**Limit:** this is not a full private IDE history, stock BB upstream, production runtime, vulnerability database or formal code audit. Registry rules can evolve, despite pinned engine; treat a passing job as scoped evidence only.
