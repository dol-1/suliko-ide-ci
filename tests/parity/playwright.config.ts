import { defineConfig } from "@playwright/test";

// Exactly the same seven tests run in both projects. No retry or skip hides failure.
export default defineConfig({
  testDir: ".",
  testMatch: "parity.spec.ts",
  timeout: 60_000,
  retries: 0,
  // Real Linux public CI observed Web-only J05/J06 timeouts while two
  // packaged GUI clients and Chromium loaded on one free runner concurrently
  // (GH 43550483830). Serialize all FOURTEEN distinct strict executions to
  // remove test-side resource contention, without retries, skips, mocking,
  // weaker selectors or replacing either real Web/packaged Desktop.
  workers: 1,
  reporter: [["list"]],
  projects: [{ name: "web" }, { name: "desktop" }],
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
});