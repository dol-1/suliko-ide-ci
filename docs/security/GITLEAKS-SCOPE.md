# D-063 public Git history Gitleaks scan

Source: [Claude E6](https://gitlab.com/dol-1-group/suliko-ide/-/work_items/36), [E6 #48](https://gitlab.com/dol-1-group/suliko-ide/-/work_items/48), [Gitleaks v8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1).

This job scans only the public CI repository, read-only. The official Linux x64 release tarball digest is pinned, checked before execution. Checkout fetches all history and does not persist credentials. Gitleaks scans Git all refs with 100% redaction. Raw stdout/stderr and finding JSON are runner-local files, removed at end; no artifacts, matched secrets, paths or content are uploaded or printed. Failed scans are NOT evidence of no findings: investigate in restricted security review. Does not scan private IDE history or implement Semgrep/OSV/Scorecard; no beta readiness implied.
