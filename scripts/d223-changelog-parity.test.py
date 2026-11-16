from pathlib import Path
src=Path('docs/release/CHANGELOG.md').read_text(encoding='utf-8')
en=Path('site/docs/changelog.en.md').read_text(encoding='utf-8')
ka=Path('site/docs/changelog.ka.md').read_text(encoding='utf-8')
nav=Path('site/mkdocs.yml').read_text(encoding='utf-8')
tag='1c7470934ab694ce69ac92e70de300d6f6c50743'
digest='8ca5634595b0ed8d3f26719163dc63126a2aea92dff59f529bcd55b712f8af6a'
for text in (src,en,ka):
 for item in (tag,digest,'43787354480','NotSigned','WSL2','Remote','mock','D215','D217','D218'):
  assert item in text, 'D223 missing precise SHA, safety caveat or source delta: '+item
 assert 'v0.1.0-rc.1' in text and 'SHA256' in text
assert 'release.en.md' in en and 'release.ka.md' in ka
assert 'changelog.en.md' in nav and 'changelog.ka.md' in nav
assert 'not a public beta' in en.lower()
assert 'არ არის საჯარო ბეტა' in ka
assert len([c for c in ka if '\u10d0'<=c<='\u10f0'])>300, 'Georgian changelog translation absent'
assert not Path('site/docs/changelog.en.md').is_symlink()
assert not Path('site/docs/changelog.ka.md').is_symlink()
print('D223_BILINGUAL_SOURCE_TAG_DIGEST_CHANGLELOG_NO_RELEASE_SCOPE=PASS')
