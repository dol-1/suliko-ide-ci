import { describe, expect, it, vi } from "vitest";
import { boundedBackoffMs, pollReceiptWithBackoff } from "./contract-mock.js";

describe("D-060 read-only Remote mock bounded status polling", () => {
  it("waits exponentially with an upper bound, reads only same synthetic job ID", async () => {
    const read = vi.fn().mockResolvedValueOnce("pending").mockResolvedValueOnce("unknown").mockResolvedValueOnce("pending").mockResolvedValueOnce("failed");
    const wait = vi.fn(async () => {});
    expect(await pollReceiptWithBackoff("demo-job-1", read, wait, 4)).toBe("failed");
    expect(read.mock.calls).toEqual([["demo-job-1"], ["demo-job-1"], ["demo-job-1"], ["demo-job-1"]]);
    expect(wait.mock.calls).toEqual([[500],[1000],[2000]]);
    expect(boundedBackoffMs(5)).toBe(4000);
  });
  it("never reports success for exhausted unknown receipt, never automatically writes", async () => {
    const read = vi.fn(async (_job: string) => "unknown" as const);
    const wait = vi.fn(async (_ms: number) => {});
    expect(await pollReceiptWithBackoff("demo-job-2",read,wait,3)).toBe("unknown");
    expect(read).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });
  it("fails closed for malformed jobs, status forgery and unbounded retries", async () => {
    const read = vi.fn(async () => "approved" as never);
    const wait = vi.fn(async () => {});
    await expect(pollReceiptWithBackoff("../private",read,wait)).rejects.toThrow(/Invalid/);
    await expect(pollReceiptWithBackoff("mock",read,wait,11)).rejects.toThrow(/bounded/);
    await expect(pollReceiptWithBackoff("mock",read,wait,2)).rejects.toThrow(/Untrusted/);
    expect(wait).not.toHaveBeenCalled();
    expect(() => boundedBackoffMs(10)).toThrow(/retry index/);
  });
  it("propagates read errors for explicit UI error state, does not reclassify as success", async () => {
    const read = vi.fn(async () => { throw new Error("synthetic disconnected"); });
    const wait = vi.fn(async () => {});
    await expect(pollReceiptWithBackoff("mock",read,wait)).rejects.toThrow(/disconnected/);
    expect(wait).not.toHaveBeenCalled();
  });
});
