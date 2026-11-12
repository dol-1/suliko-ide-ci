import { describe, expect, it } from "vitest";
import { isCompatibleBbVersion } from "./version-compat.js";

describe("BB runtime compatibility range", () => {
  it("accepts only the vetted 0.49.0 release family", () => {
    expect(isCompatibleBbVersion("0.49.0")).toBe(true);
    expect(isCompatibleBbVersion("0.49.0+verified")).toBe(true);
    for (const value of ["0.49.0-rc.1", "0.49.1", "0.50.0", "0.48.9", "", null, undefined]) {
      expect(isCompatibleBbVersion(value)).toBe(false);
    }
  });
});