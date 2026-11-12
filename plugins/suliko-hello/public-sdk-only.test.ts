import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { experimental_scanPublicSdkOnly } from "@get-bb/plugin-sdk/testing";

// BB desktop-v0.49.0 SDK's own public-boundary scanner.
// React is used by the frontend; Testing Library is used only by a test.
const packageRoot = dirname(fileURLToPath(import.meta.url));
const scan = experimental_scanPublicSdkOnly(packageRoot, {
  allow: [/^react$/u, /^@testing-library\/react$/u],
});

describe("Suliko Hello uses public BB plugin APIs only", () => {
  it("checks the actual frontend, backend and test files", () => {
    expect(scan.files).toContain("app.tsx");
    expect(scan.files).toContain("server.ts");
    expect(scan.files).toContain("app.test.tsx");
    expect(scan.files).toContain("server.test.ts");
  });

  it("has no private @bb/* or out-of-package import", () => {
    expect(scan.violations).toEqual([]);
  });

  it("declares no private @bb/* dependency", () => {
    expect(scan.privateDependencies).toEqual([]);
  });
});