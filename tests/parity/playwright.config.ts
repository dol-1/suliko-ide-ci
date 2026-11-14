import { defineConfig } from "@playwright/test";

// Exactly the same seven tests run in both projects. No retry or skip hides failure.
export default defineConfig({
  testDir: ".",
  testMatch: "parity.spec.ts",
  timeout: 60_000,
  retries: 0,
  // Genuine packaged Electron and Web share host/fixture boundary; run the
  // strict 7x2 tests sequentially instead of racing GUI instances. No retry,
  // skipped test or weakened UI assertion; original 14 must all pass.
  workers: 1,
  reporter: [["list"]],
  projects: [{ name: "web" }, { name: "desktop" }],
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
});