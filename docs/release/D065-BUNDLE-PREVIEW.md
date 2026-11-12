# D-065 built plugin bundle rehearsal (not a release)

Source: [E8 #50](https://gitlab.com/dol-1-group/suliko-ide/-/work_items/50), [Claude E8 #36](https://gitlab.com/dol-1-group/suliko-ide/-/work_items/36), manual v1.10. This GitHub Actions job rebuilds own Hello BB plugin from reviewed SDK and checks server.js/app.js/app.css; builds the **Remote mock client-only** JavaScript using pinned esbuild. No real Remote authority is connected; no token, write action, BB core change or publisher release.

Workflow pins stock BB/SDK engine declarations and runs both plugins' typecheck and full unit tests. SHA-256 of four **actual generated outputs** (not just their sources) is printed in the GitHub run summary and tied to the exact run HEAD. No built artifacts, archives, manifests, v tags, npm packages or public beta are uploaded or published.

Remaining E8: complete transitive SBOM, reproducible byte-for-byte archive, official attestation/provenance, approved marketplace beta channel manifest, versioning and release runbook. This is an **output checksum preflight**, not an independently certified release.
