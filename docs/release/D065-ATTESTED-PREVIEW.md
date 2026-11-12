# D-065 official attestation rehearsal (NO release)

Source: [E8 #50](https://gitlab.com/dol-1-group/suliko-ide/-/work_items/50), Claude E8 #36, [official GitHub actions/attest v4.2.2](https://github.com/actions/attest/releases/tag/v4.2.2) fixed SHA `1e69f48acb82d1966a394da916b4c1698aa569d6`.

The free standard public Ubuntu runner builds our Hello BB plugin and *Remote mock client UI only*, running pinned SDK/BB checks and unit/type tests. Five generated files go into a normalized ephemeral gzip archive, hash is recorded, and no archive/package/release/tag is published. No real Remote calls or BB upstream code are changed.

Official GitHub attestation creates a **public repo-associated provenance record**, even though the local bundle is not uploaded, published or distributed. It requires narrowly scoped id-token:write, attestations:write, artifact-metadata:write with contents:read, push-to-registry:false. A separate `gh attestation verify` step confirms the signed provenance against the same-run archive, failing closed on verification errors. All bytes and verification JSON are discarded from the runner.

**Limits:** a successful ephemeral in-run signature is not a production signed binary, cross-machine reproducibility, independent off-run provenance verification, complete SPDX coverage or beta authorization. No v* tag, release, public invitation or real user installation is permitted. Reconciliation of dependencies, 3-OS artifacts, plugin release channel and explicit owner GO remain outstanding.