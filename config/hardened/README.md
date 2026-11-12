# SEC-02 — hardened stock BB profile (V1)

**Status: code in Draft MR, CI/runtime verification pending.** Pinned baseline: `get-bb/bb@desktop-v0.49.0`. This directory contains **no keys**. No BB upstream changes, no deployment and no hidden plugin disabling assumptions.

## Verified BB mechanism

- BB's own `bb plugin disable <id> --json` **unloads the installed plugin**, `bb plugin list --json` reports `{plugins:[{id,enabled,status,...}]}`. Sources: [BB plugin CLI L1033–L1040](https://github.com/get-bb/bb/blob/desktop-v0.49.0/apps/cli/src/commands/plugin.ts#L1033-L1040), [disable implementation L1860–L1895](https://github.com/get-bb/bb/blob/desktop-v0.49.0/apps/cli/src/commands/plugin.ts#L1860-L1895), [server route L802–L810](https://github.com/get-bb/bb/blob/desktop-v0.49.0/apps/server/src/routes/plugins.ts#L802-L810).
- Exact plugin IDs from pinned manifests: `bb--mcp` (`plugins/mcp/package.json:L2`); `account-pool` (`plugins/account-pool/package.json:L2`); `connect` (`plugins/connect/package.json:L2`); `bb--connect-next` (`plugins/connect-next/package.json:L2`); `memory` (`plugins/memory/package.json:L2`). See [manifest directory](https://github.com/get-bb/bb/tree/desktop-v0.49.0/plugins). The MCP builtin is disabled by default, but startup must still verify.
- `BB_SERVER_BIND_HOST=127.0.0.1` and `BB_TELEMETRY=false` are documented startup-only settings. **A shell `.env` file is not automatically loaded by packaged BB**; use [BB configuration docs L98–L136](https://github.com/get-bb/bb/blob/desktop-v0.49.0/docs/configuration.md#L98-L136) and [L243–L253](https://github.com/get-bb/bb/blob/desktop-v0.49.0/docs/configuration.md#L243-L253). A running `0.0.0.0` listener requires **restart**; a config refresh alone does not close it.

## Private-marketplace gate (documented, NOT satisfied)

- BB 0.49.0 can add a Git-backed marketplace from a `marketplace.json` catalog and install a Git plugin at a reviewed commit/tag. See the [pinned BB distribution contract](https://github.com/get-bb/bb/blob/desktop-v0.49.0/plugins/bb-guide/skills/bb-plugin-authoring/references/distribution.md). Private Git access remains governed by the host's authenticated Git account; **never put access tokens in catalog files, repository URLs, shell history or CI logs**.
- The IDE GitLab repository is currently private, **but no Suliko `marketplace.json` catalog has been provisioned or registered with a real BB installation**. Repository visibility alone does not satisfy the V1 private marketplace acceptance criterion; it is a separate deployment/review gate.
- Before an approved release, review the exact private catalog source and install ref, verify its access control and available entries with stock `bb marketplace list`, and verify that unreviewed third-party marketplace installs are not part of the Suliko launch procedure. Installation and updates execute third-party code with full trust. No `--yes` without explicit review. Do not publish a private catalog or its contents to the public CI repository.

## Intended owner-side setup (not performed by this repository)

1. On **one owner-controlled computer**, persist nonsecret startup values with stock BB's `bb-app env set BB_SERVER_BIND_HOST 127.0.0.1` and `bb-app env set BB_TELEMETRY false`, or pass explicit supported startup flags/environment. Reboot/restart the app after any bind change.
2. Inspect `bb plugin list --json`. For any installed dangerous plugin, run **only** the stock command `bb plugin disable <id>` using the exact five IDs above. Noninstalled plugins stay absent; never install them merely to disable them. Never use `safe-mode on` as a substitute: BB explicitly says it does **not** disable bundled plugins.
3. Verify the **effective runtime environment** matches `.env.hardened`. Launch the verifier in the same controlled environment as the process (or pass its exact values), for example:

   ```bash
   BB_SERVER_BIND_HOST=127.0.0.1 BB_TELEMETRY=false bash scripts/verify-hardened.sh
   ```

   The script calls live `bb plugin list --json` and exits `1` on absent/invalid env, plugin list unavailable, unknown plugin state, or any dangerous plugin still enabled. It exits `0` only for this **configuration check**. It does not start BB, change plugins, or read secrets.
4. Separately verify that the **actual running listener** binds only `127.0.0.1` and is unreachable from another LAN host, and validate the Tailscale Serve/ACL owner-only policy. This **runtime network test is not implemented by the script** and remains a release gate. Never mistake a successful env contract check for proof that no already-running public listener exists.
5. Run tests in `suliko-ide-ci` (once provisioned) against the pinned stock BB build. The fixture-only CI contract check is:

   ```bash
   BB_SERVER_BIND_HOST=127.0.0.1 BB_TELEMETRY=false \
     bash scripts/verify-hardened.sh --plugins-json tests/fixtures/hardened/disabled.json
   ```

   **A fixture is not a live plugin-state or deploy verification**. The CI job must additionally check against a running BB instance or mark those checks pending.

## CI and failure requirements

- The source branch now contains a shared MR-only `/.gitlab-ci.yml` router with a conditional local `ci/gitlab/sec02.yml` job (Node 22.19.0 + Bash syntax checks + the complete fixture contract script) that needs no user secrets. GitLab created [pipeline 3057321893](https://gitlab.com/dol-1-group/suliko-ide/-/pipelines/3057321893) at commit `1d4709ad`, but its sole job was **not executed**: failure reason `ci_quota_exceeded`. GitLab YAML's `merge_request_event` workflow rule follows [official GitLab guidance](https://docs.gitlab.com/ci/yaml/workflow/). This is an additional native CI check, **not** the requested GitHub stock BB build.
- Positive fixture `disabled.json` should exit **0**; negative fixture `enabled-mcp.json` should exit **1**; missing/invalid JSON and runtime env should also exit **1**.
- These checks need a real workflow in public `dol-1/suliko-ide-ci`. **GitHub repo currently does not exist and no workflow/job/run has been created**; tracked as [SPIKE-01 #8](https://gitlab.com/dol-1-group/suliko-ide/-/work_items/8). Do not mark the CI acceptance box before a real green run.
- Only a reviewed IDE-side code MR with AGY/Claude gates per [manual §8.3](../../docs/ops/CHATGPT-OPERATING-MANUAL.md) can merge this profile. It cannot modify BB, Remote/Memo services or grant new auth/sandbox privileges.

**Shared GitLab CI integration:** SEC-02 and SPIKE-04 use the **byte-identical** root router in their respective Draft branches and separate issue-owned `ci/gitlab/*.yml` files. The official [GitLab conditional local include](https://docs.gitlab.com/ci/yaml/includes/#use-rules-with-include) only loads a job file when present. This prevents either issue's root CI from replacing the other's job when both are eventually merged. No claim of green CI: the project still reports `ci_quota_exceeded`.