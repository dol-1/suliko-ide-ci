# Changelog — reviewed source, not a public release

## 2026-11-16 · v0.1.0-rc.1 source candidate

Canonical immutable tag: `suliko-hello/v0.1.0-rc.1` at `1c7470934ab694ce69ac92e70de300d6f6c50743`. Independent candidate SHA256: `8ca5634595b0ed8d3f26719163dc63126a2aea92dff59f529bcd55b712f8af6a`. [Actual tag-ref D166 CI proof](https://github.com/dol-1/suliko-ide-ci/actions/runs/43787354480) confirms two builders, but not a public release. [Read RC1 source release notes](release.en.md).

**Included in tagged source:** our own Hello plugin, local SEC02 safety checks, installation/uninstall contract for disposable CI, KA/EN documentation, and Web/Desktop synthetic Remote **mock** panel.

**Unreleased main-only work after this tag:** D197 dependency pinning, D198 doctor hardening, D202 Windows uninstaller validation, D203/D204 Pages, D215 SHA provenance fix/icon, D217 workflow reporting, D218 native3OS tagged-install docs, tracked separately. None were backported to the tag.

**Known limitations:** official Windows package **NotSigned** (digest is not publisher signature); BB CLI on Windows runs in **WSL2**, while desktop GUI is native; Remote remains a **mock**, not authenticated live service. This is **not a public beta** or permission to install on personal devices; no GitHub release object or user invitation.

[ქართული](changelog.ka.md) · [Installation](install.en.md) · [RC1 notes](release.en.md)
