import { describe, expect, it } from "vitest";
import { isCompatibleBbVersion, publicBbVersion } from "./version-compat.js";

describe("BB runtime compatibility range", () => {
  it("accepts only the vetted 0.49.0 release family", () => {
    expect(isCompatibleBbVersion("0.49.0")).toBe(true);
    expect(isCompatibleBbVersion("0.49.0+verified")).toBe(true);
    for (const value of ["0.49.0-rc.1", "0.49.1", "0.50.0", "0.48.9", "", null, undefined]) {
      expect(isCompatibleBbVersion(value)).toBe(false);
    }
  });
  it("never sends unbounded or untrusted BB version strings into status labels", () => {
    expect(publicBbVersion("0.49.0")).toBe("0.49.0");
    expect(publicBbVersion("0.49.0+official.build.3")).toBe("0.49.0");
    expect(publicBbVersion("0.49.1")).toBe("0.49.1");
    for (const value of [
      "0.49.0-sk-SYNTHETIC_TOKEN_1234567890", "0.49.0+sk-SYNTHETIC_TOKEN_1234567890",
      "0.49.0\\nSensitive: fake", " 0.49.0 ", "2.0.0|Injected", "0.49.0+" + "a".repeat(70),
      "1.2.3-rc1", "01.2.3", null, undefined, {},
    ]) {
      expect(publicBbVersion(value)).toBeNull();
    }
  });
});
