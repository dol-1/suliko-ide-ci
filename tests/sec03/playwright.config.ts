import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "ipc-negative.spec.ts",
  timeout: 75_000,
  retries: 0,
  fullyParallel: false,
  reporter: [["list"]],
  use: { trace: "retain-on-failure" },
});
