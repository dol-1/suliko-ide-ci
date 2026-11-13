/** Source pin: get-bb/bb@desktop-v0.49.0; do not silently accept a newer BB release. */
export const ALLOWED_BB_VERSION_RANGE = ">=0.49.0 <0.49.1" as const;

// Matches the tagged 0.49.0 release (optional semver build metadata), never
// prereleases or later patches. No extra semver package needed.
export function isCompatibleBbVersion(value: unknown): value is string {
  return typeof value === "string" && /^0\.49\.0(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}

/** Return only a bounded numeric release for a status label, never raw SDK text. */
export function publicBbVersion(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 64) return null;
  const match = /^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})(?:\+[0-9A-Za-z.-]{1,32})?$/.exec(value);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : null;
}
