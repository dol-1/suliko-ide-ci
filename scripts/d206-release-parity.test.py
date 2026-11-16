"""D206: exact tagged SHA and safety scope parity across public KA/EN notes."""
from pathlib import Path
import re

src=Path("docs/release/v0.1.0-rc.1.md").read_text(encoding="utf-8")
en=Path("site/docs/release.en.md").read_text(encoding="utf-8")
ka=Path("site/docs/release.ka.md").read_text(encoding="utf-8")
nav=Path("site/mkdocs.yml").read_text(encoding="utf-8")
hashes=[
"1c7470934ab694ce69ac92e70de300d6f6c50743",
"8ca5634595b0ed8d3f26719163dc63126a2aea92dff59f529bcd55b712f8af6a",
"8349ab773715624fec5082739c817d2a15809504699d34b47d3d9dfbe60fc770",
"5bebb0b635c1c8b14e549fe3799152d8a6375bb2e8259be328897e1906f63e17",
"201b38136c30f37d17ee5fea88c7a91dde64e00ca4e583dfd5b3650e65c6aa2f"
]
for text in [src,en,ka]:
 for h in hashes: assert h in text,"D206 SHA mismatch between source and bilingual site"
 for required in ["NotSigned","WSL2","Remote","D197","D198","D202","D203"]:
  assert required in text,"D206 missing caveat: "+required
 assert "43776957679" in text,"D206 missing actual immutable-source two-builder evidence"
assert "release.en.md" in nav and "release.ka.md" in nav
assert "not a public" in en.lower() or "not been published" in en.lower()
assert "არა საჯარო" in ka or "არ არის გამოქვეყნებული" in ka
assert len(re.findall("[ა-ჰ]",ka))>200,"D206 Georgian not translated"
assert "not a run on the tag ref" in en or "not yet a D166 workflow run on the tag ref" in en
assert "ტეგზე უშუალო" in ka
print("D206 5 fixed digests + KA EN limitations, tag run distinction and live-nav parity PASS")
