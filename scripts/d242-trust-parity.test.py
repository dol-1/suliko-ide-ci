"""D242: static macOS/Linux KA/EN trust copy and negative no-bypass fixtures."""
from pathlib import Path
import re

EN = Path("site/docs/macos-linux-trust.en.md").read_text(encoding="utf-8")
KA = Path("site/docs/macos-linux-trust.ka.md").read_text(encoding="utf-8")
def check(en: str, ka: str) -> None:
    for lang, text in (("EN", en), ("KA", ka)):
        assert text.startswith("# ") and len(text) >= 1300, "D242_MISSING_PAGE_" + lang
        for term in ("SHA-256", "shasum -a 256", "sha256sum", "Gatekeeper", "macOS", "Linux", "notarization", "64"):
            assert term in text, "D242_MISSING_" + term + "_" + lang
        for reference in ("https://support.apple.com/en-us/102445", "https://developer.apple.com/developer-id/"):
            assert reference in text, "D242_MISSING_APPLE_REFERENCE_" + lang
        for poison in (r"(?i)step.by.step to disable gatekeeper", r"(?i)ignore.*malware warning to proceed", r"(?i)run untrusted package regardless"):
            assert re.search(poison, text) is None, "D242_BYPASS_GUIDANCE_" + lang
        assert re.search(r"(?m)^FILE='<path-to-existing-file>'$", text), "D242_NO_EXISTING_FILE_ONLY_" + lang
    assert en.lower().count("not a released public beta") == 1, "D242_EN_NO_BETA_CAVEAT"
    assert "საჯარო ბეტა" in ka and "არ გამოქვეყნებულა" in ka, "D242_KA_NO_BETA_CAVEAT"
    assert sum("\u10d0" <= ch <= "\u10ff" for ch in ka) >= 150, "D242_KA_TRANSLATION_MISSING"
    assert "macos-linux-trust.en.md" in Path("site/mkdocs.yml").read_text(encoding="utf-8")
    assert "macos-linux-trust.ka.md" in Path("site/mkdocs.yml").read_text(encoding="utf-8")
    assert "Windows trust" in en and "Windows-ის ნდობა" in ka
check(EN, KA)
for suffix in ("step-by-step to disable Gatekeeper", "ignore a malware warning to proceed", "run untrusted package regardless"):
    try:
        check(EN + "\n" + suffix, KA)
    except AssertionError as exc:
        assert "D242_BYPASS_GUIDANCE" in str(exc), "D242_FAIL_CLOSED_CLASSIFICATION"
    else:
        raise AssertionError("D242_NEGATIVE_FIXTURE_ACCEPTED")
print("D242_MACOS_LINUX_SHA256_GATEKEEPER_KA_EN_NO_BYPASS=PASS")
