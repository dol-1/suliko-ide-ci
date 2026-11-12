// E9 CI adapter: BB 0.49.0 requires a bb.server manifest entry to install.
// Pure no-op plugin — the Remote demo remains app-local in mock-remote.ts.
// No RPC, credentials, tokens, shell, background jobs, or network connection.
import type { BbPluginApi } from "@get-bb/plugin-sdk";

export default function plugin(_bb: BbPluginApi): void {
  // Intentionally no side effects; never grant in-IDE approval authority.
}
