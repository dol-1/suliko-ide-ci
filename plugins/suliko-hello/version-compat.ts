/** Source pin: get-bb/bb@desktop-v0.49.0; do not silently accept a newer BB release. */
export const ALLOWED_BB_VERSION_RANGE = ">=0.49.0 <0.49.1" as const;

// Matches the tagged 0.49.0 release (optional semver build metadata), never
// prereleases or later patches. No extra semver package needed.
export function isCompatibleBbVersion(value: unknown): value is string {
  return typeof value === "string" && /^0\.49\.0(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}