from pathlib import Path
nav=Path('site/mkdocs.yml').read_text(encoding='utf-8')
files={p:Path('site/docs/'+p).read_text(encoding='utf-8') for p in ('pilot-start.en.md','pilot-start.ka.md','pilot-feedback.en.md','pilot-feedback.ka.md')}
private=Path('docs/pilot/D208-OWNER-FREE-15MIN-KIT.md').read_text(encoding='utf-8')
for p,s in files.items():
 assert p in nav, 'D208 missing bilingual site nav '+p
 assert len(s)>1100 and 'Remote' in s and 'mock' in s and 'NotSigned' in (files['pilot-start.en.md']+files['pilot-start.ka.md'])
 assert '15' in s and 'N/A' in (files['pilot-feedback.en.md']+files['pilot-feedback.ka.md'])
 assert 'suliko-doctor.mjs --live --bundle NEWFILE.json' in files['pilot-start.en.md'] and 'suliko-doctor.mjs --live --bundle NEWFILE.json' in files['pilot-start.ka.md']
 assert 'pilot.en.md' in files['pilot-start.en.md'] and 'pilot.ka.md' in files['pilot-start.ka.md']
 assert not any(x in s for x in ('PAGES_ENABLED','Auto submit','Send your API key'))
for k in ('p50/p90','N/A','NOT SENT','SHARE-LINK.md'):
 assert k in private, 'D208 missing scope/gate '+k
for lang in ('en','ka'):
 feedback=files['pilot-feedback.'+lang+'.md']
 assert 'N/A' in feedback and 'p50/p90' in feedback and 'Remote' in feedback
 assert len([c for c in files['pilot-start.ka.md'] if '\u10d0'<=c<='\u10f0'])>500,'D208 KA translation too short'
print('D208_KA_EN_PILOT_FIRST_15MIN_FEEDBACK_DOCTOR_PRIVACY_PARITY=PASS')
