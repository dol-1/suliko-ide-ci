# D-063 pinned OSV Scanner on public plugin lockfiles

Source: [E6 #48](https://gitlab.com/dol-1-group/suliko-ide/-/work_items/48), [OSV Scanner v2.7.1](https://github.com/google/osv-scanner/releases/tag/v2.7.1) official release and SHA-256 digest. Scan only two public CI resolved pnpm-lock.yaml files (Hello and Remote mock), **not** private IDE or installed user environments. No secrets or read-write API permissions.

The pinned scanner binary is hash-verified before execution. Scan report/stdout/stderr remain ephemeral in runner temp and are never uploaded; only parse success and final outcome printed. Vulnerabilities or scanner errors yield nonzero, **not** an automatic dependency update; triage through restricted security review and separately tested MR. OSV advisory coverage and lockfile interpretation are time-bound; a pass does not prove all dependencies are safe.
