import { defineConfig } from "@playwright/test";

// Exactly the same seven tests run in both projects. No retry or skip hides failure.
export default defineConfig({
  testDir: ".",
  testMatch: "parity.spec.ts",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  projects: [{ name: "web" }, { name: "desktop" }],
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
});