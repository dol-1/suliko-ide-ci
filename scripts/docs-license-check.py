#!/usr/bin/env python3
"""D-062 license policy: fail closed on unsupported/unknown installed Python packages.

Third-party legal declarations require periodic maintainer review. CI evidence is NOT
a legal opinion and does not scan copied/wheel code or find vulnerabilities.
"""
import re
import sys
from importlib import metadata

ALLOWED = {
    "MIT", "BSD-2-Clause", "BSD-3-Clause", "BSD-4-Clause", "Apache-2.0",
    "PSF-2.0", "MPL-2.0", "ISC", "CC0-1.0", "Zlib", "0BSD", "Unlicense",
}
LEGACY = {
    "MIT": "MIT",
    "MIT License": "MIT",
    "BSD": "BSD-3-Clause",
    "BSD License": "BSD-3-Clause",
    "Apache 2.0": "Apache-2.0",
    "Apache Software License": "Apache-2.0",
    "Apache License 2.0": "Apache-2.0",
    "Python Software Foundation License": "PSF-2.0",
    "ISC License": "ISC",
    "MPL 2.0": "MPL-2.0",
}
TOKENS = re.compile(r"\\(|\\)|[A-Za-z0-9.]+(?:-[A-Za-z0-9.]+)*")

def declared_license(m):
    expression = (m.get("License-Expression") or "").strip()
    if expression:
        tokens = TOKENS.findall(expression)
        clean = TOKENS.sub("", expression).strip()
        if clean or not tokens:
            return None
        license_ids = [t for t in tokens if t not in {"AND", "OR", "WITH", "(", ")"}]
        if "WITH" in tokens or not license_ids or any(x not in ALLOWED for x in license_ids):
            return None
        return expression
    legacy = (m.get("License") or "").strip()
    if legacy in LEGACY:
        return LEGACY[legacy]
    classifiers = m.get_all("Classifier") or []
    ids = [item.rsplit("::", 1)[-1].strip() for item in classifiers if item.startswith("License :: OSI Approved ::")]
    matches = {LEGACY[x] for x in ids if x in LEGACY}
    # Explicit unknown license classifiers block. Ambiguous multiple licenses require review.
    if ids and len(matches) == len(ids) and len(matches) == 1:
        return next(iter(matches))
    return None

def main():
    if sys.argv[1:] == ["--self-test"]:
        tests = [
            ({"License-Expression": "MIT OR Apache-2.0"}, True),
            ({"License-Expression": "GPL-3.0-only"}, False),
            ({"License-Expression": "MIT WITH Classpath-exception-2.0"}, False),
            ({"License": "MIT License"}, True),
            ({"License": "unknown proprietary"}, False),
            ({}, False),
        ]
        for d, expected in tests:
            class Mock(dict):
                def get_all(self, key): return None
            assert (declared_license(Mock(d)) is not None) is expected, d
        print("Synthetic license-policy guard passed")
        return 0
    if sys.argv[1:]:
        print("Unexpected license audit options")
        return 2
    failures = []
    observed = []
    for dist in metadata.distributions():
        name = dist.metadata.get("Name", "unknown")
        version = dist.version
        license_id = declared_license(dist.metadata)
        observed.append((name, version, license_id or "UNKNOWN/REVIEW"))
        if not license_id:
            failures.append(name)
    for name, version, lic in sorted(observed, key=lambda x: x[0].lower()):
        print(f"{name}=={version}: {lic}")
    print(f"Python distributions audited: {len(observed)}; unknown or disallowed: {len(failures)}")
    if failures:
        print("FAIL CLOSED: review third-party licenses before merging docs-site dependency.")
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
