"""D233: bilingual Windows trust content parity and no-bypass negative fixtures (source only)."""
from pathlib import Path
import re
en=Path("site/docs/windows-trust.en.md").read_text(encoding="utf-8")
ka=Path("site/docs/windows-trust.ka.md").read_text(encoding="utf-8")
def check(en,ka):
    for lang,text in [("EN",en),("KA",ka)]:
        assert text.startswith("# ") and len(text)>500, "D233_MISSING_PAGE_"+lang
        for term in ["NotSigned","SmartScreen","SHA-256","Get-FileHash","-LiteralPath","-Algorithm SHA256","WSL2","GUI","CLI"]:
            assert term in text, "D233_MISSING_"+term+"_"+lang
        for bad in [r"(?i)disable\s+smartscreen",r"(?i)click\s+run\s+anyway",r"(?i)bypass\s+smartscreen\s+to\s+install"]:
            assert re.search(bad,text) is None,"D233_BYPASS_ADVICE_"+lang
    assert sum("\u10d0"<=c<="\u10ff" for c in ka)>80,"D233_KA_MISSING"
    assert "not a released public beta" in en.lower() and "საჯარო ბეტა" in ka,"D233_NO_BETA_SCOPE"
    return True
assert check(en,ka)
for poison in ["disable SmartScreen","click Run anyway","bypass SmartScreen to install"]:
    try: check(en+"\n"+poison,ka)
    except AssertionError as e: assert "D233_BYPASS_ADVICE" in str(e)
    else: raise AssertionError("D233_NEGATIVE_BYPASS_ACCEPTED")
print("D233_WINDOWS_NOTSIGNED_SHA256_KA_EN_NO_BYPASS=PASS")
