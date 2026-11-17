import test from 'node:test';
import assert from 'node:assert/strict';
import {lint} from './d252-glossary-lint.mjs';
const glossary={schema:'suliko-d252-ka-en-glossary-v1',entries:[
 {id:'approval',uiFile:'plugins/suliko-remote-panel/i18n.ts',uiKey:'pendingApprovals',en:'Pending approvals',ka:'მოლოდინში მყოფი თანხმობები'},
 {id:'docs',docsKa:'site/docs/remote.ka.md',docsKaPhrase:'მოლოდინში მყოფი თანხმობები',forbiddenKa:['დამტკიცებებს']},
 {id:'privacy',docsKa:'site/docs/remote.ka.md',docsKaPhrase:'[კონფიდენციალურობა](privacy.ka.md)'}
]};
const source=[
 'export const EN = {',' pendingApprovals: "Pending approvals",','} as const;',
 'export const KA: Record<TextKey,string> = {',
 ' pendingApprovals: "მოლოდინში მყოფი თანხმობები",','};'
].join(String.fromCharCode(10));
const files={'plugins/suliko-remote-panel/i18n.ts':source,
 'site/docs/remote.ka.md':'მოლოდინში მყოფი თანხმობები [კონფიდენციალურობა](privacy.ka.md)'};
test('canonical UI and docs terms',()=>{assert.equal(lint(glossary,f=>files[f]).entries,3)});
test('reject alternate translation',()=>{assert.throws(()=>lint(glossary,f=>f.endsWith('.ka.md')?'დამტკიცებებს':files[f]),/D252_KA_DOC_DRIFT/)});
test('reject UI drift',()=>{assert.throws(()=>lint(glossary,f=>f.endsWith('i18n.ts')?source.replace('Pending approvals','Waiting approvals'):files[f]),/D252_UI_DRIFT/)});
test('reject private unreviewed path',()=>{const c=structuredClone(glossary);c.entries[0].uiFile='../secret.ts';assert.throws(()=>lint(c,f=>files[f]),/D252_BAD_PATH/)});
