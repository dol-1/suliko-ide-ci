# v0.1.0-rc.1 — source candidate notes (NOT a public release)

**What's included at this exact tag:** our own Suliko Hello plugin and BB plugin config, synthetic SEC-02 loopback/disabled-plugin checks, installed Web/packaged Desktop **Remote mock UI** (no actual Remote credentials or approval writes), guarded KA/EN docs, safe installation/uninstall code tested in *disposable* Windows/macOS/Linux public CI, and reproducible SHA-reviewed candidate assembly. Important earlier reviewed CI changes: [!157](https://gitlab.com/dol-1-group/suliko-ide-ci/-/merge_requests/157), [!173](https://gitlab.com/dol-1-group/suliko-ide-ci/-/merge_requests/173), [!175](https://gitlab.com/dol-1-group/suliko-ide-ci/-/merge_requests/175), [!177](https://gitlab.com/dol-1-group/suliko-ide-ci/-/merge_requests/177), [!178](https://gitlab.com/dol-1-group/suliko-ide-ci/-/merge_requests/178) and [!179](https://gitlab.com/dol-1-group/suliko-ide-ci/-/merge_requests/179).

**Not included at this tag:** subsequent D197 pinned npm dependency lock, D198 real local `suliko doctor --live`, D202 Windows uninstaller-executable SHA256 hardening, and Pages API-only D203. These are **later commits**, not retroactively part of rc.1.

**Compatibility and limits:** pinned upstream BB Desktop `desktop-v0.49.0` on Linux x86_64, macOS arm64, Windows x64. The official Windows installer is **Authenticode NotSigned**; a matching SHA-256 proves bytes match the reviewed file, **not the publisher's signature**. Do not disable Windows security warnings. BB CLI on Windows is supported **only under Ubuntu WSL2** (Linux paths), while the official BB GUI runs natively on Windows. Remote panel is a **demo/mock**, not an authenticated service. Provider keys and private user data never belong in issue reports. No public-facing released setup is authorized.

**One-command setup contract — reviewer-only, no user invitation:** a reviewed, locally available candidate archive and its exact SHA-256 are required; setup does not download or trust an arbitrary RC automatically. In isolated approved CI, the relevant single command is:
```bash
bash scripts/suliko-setup.sh --install --plugin-sha 8ca5634595b0ed8d3f26719163dc63126a2aea92dff59f529bcd55b712f8af6a --candidate-file /absolute/reviewed/suliko-hello-v0.1.0-rc.1.tar.gz
```
On a disposable Windows runner with an *explicit* scoped opt-in for the verified **NotSigned** stock BB executable only:
```powershell
pwsh -NoProfile -File scripts/suliko-setup.ps1 -Install -AllowUnsignedVerified -PluginSha 8ca5634595b0ed8d3f26719163dc63126a2aea92dff59f529bcd55b712f8af6a -CandidateFile C:\absolute\reviewed\suliko-hello-v0.1.0-rc.1.tar.gz
```
These are **reviewer examples, not instructions to run on personal/production computers**. Do not bypass SmartScreen or operating-system signature checks. For non-installing documentation checks, the source includes `bash scripts/suliko-setup.sh --dry-run` or `pwsh -NoProfile -File scripts/suliko-setup.ps1 -DryRun`. For tracked, already approved synthetic setups only: `bash scripts/suliko-setup.sh --uninstall` (Linux/macOS) or `pwsh -NoProfile -File scripts/suliko-setup.ps1 -Uninstall` (Windows). Uninstall must preserve foreign BB installs and user data.

**Hashes and provenance** (no signed package claim):

| Pin | SHA / source |
| --- | --- |
| RC canonical commit | `1c7470934ab694ce69ac92e70de300d6f6c50743` |
| Two-builder RC candidate archive | `8ca5634595b0ed8d3f26719163dc63126a2aea92dff59f529bcd55b712f8af6a` |
| Linux BB x86_64 AppImage | `8349ab773715624fec5082739c817d2a15809504699d34b47d3d9dfbe60fc770` |
| macOS BB arm64 DMG | `5bebb0b635c1c8b14e549fe3799152d8a6375bb2e8259be328897e1906f63e17` |
| Windows BB x64 installer | `201b38136c30f37d17ee5fea88c7a91dde64e00ca4e583dfd5b3650e65c6aa2f` |

Public reproducible two-builder [D166 proof on the tag's exact source commit, run on main](https://github.com/dol-1/suliko-ide-ci/actions/runs/43776957679) had matching candidate bytes and test-only OIDC provenance. This **is not yet a D166 workflow run on the tag ref**. Owner phase: Pages live → tag-specific review and candidate approval → separate opt-in pilot share. No GitHub release object is created by this note.

[Installation](install.en.md) · [Troubleshooting](troubleshooting.en.md) · [ქართული](release.ka.md)
