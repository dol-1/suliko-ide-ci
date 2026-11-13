// E3: fixed bounded read-only demo polling. No credential, network or write scope.
export const POLL_BASE_MS = 15_000;
export const POLL_MAX_MS = 120_000;
export function pollingDelay(consecutiveFailures: number): number {
  if (!Number.isSafeInteger(consecutiveFailures) || consecutiveFailures < 0) {
    throw new RangeError("Invalid polling failure count");
  }
  return Math.min(POLL_MAX_MS, POLL_BASE_MS * 2 ** Math.min(consecutiveFailures, 3));
}
