# D-060 E3 read-only Remote mock state probe

Based on pinned D-055 status-only contract; no Remote backend, network, token, approval mutation, execution, BB core changes or credential storage. The mock panel already shows loading/error/device/pending/outcome; this patch adds visible offline/empty notices and an injectable bounded exponential polling helper for an **existing receipt only**. Synthetic tests ensure same ID, no replay, no forged success, fail-closed validation and explicit disconnected error.

**Not complete:** no actual remote endpoint or token. Official upstream BB uses secret plugin settings (`bb.settings.define` with `secret: true`), but we do not store or request a real token in this mock. Need separate reviewed BB plugin backend with secure settings, a mock HTTP server and installed packaged Desktop/Web Playwright E2E before E3 #45 can close.
