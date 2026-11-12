# Suliko Remote read-only status panel

The planned IDE plugin displays **device status, pending approvals and recorded outcomes** from Suliko Remote. Approval decisions happen **only on the separate authenticated Remote page**, never in an IDE panel. Status polling must handle offline, timeout and unknown outcomes without treating them as success.

Current CI covers synthetic/mock client contracts only. This preview does **not** connect to a live Remote service and provides no Remote token. Do not paste credentials into the IDE or a public support issue.

[Privacy](privacy.en.md) · [Troubleshooting](troubleshooting.en.md)
