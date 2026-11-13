import { describe, expect, it } from "vitest";
import { pollingDelay, POLL_BASE_MS, POLL_MAX_MS } from "./polling.js";

describe("E3 read-only polling delay", () => {
  it("polls after 15s success then backs off to 30/60/120s after repeated errors", () => {
    expect([0,1,2,3,4,1000].map(pollingDelay)).toEqual([15000,30000,60000,120000,120000,120000]);
    expect(POLL_BASE_MS).toBe(15000);
    expect(POLL_MAX_MS).toBe(120000);
  });
  it("fails closed on malformed and negative counts", () => {
    for (const count of [-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER+1]) {
      expect(() => pollingDelay(count)).toThrow(RangeError);
    }
  });
});
