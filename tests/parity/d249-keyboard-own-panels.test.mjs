import test from 'node:test';
import assert from 'node:assert/strict';
import {hasVisibleFocusStyle} from './d249-keyboard-own-panels.mjs';
test('D249 explicit visible focus style rejects hidden outlines',()=>{
 assert.equal(hasVisibleFocusStyle({outlineStyle:'none',outlineWidth:'0px',boxShadow:'none'}),false);
 assert.equal(hasVisibleFocusStyle({outlineStyle:'solid',outlineWidth:'2px',boxShadow:'none'}),true);
 assert.equal(hasVisibleFocusStyle({outlineStyle:'none',outlineWidth:'0px',boxShadow:'rgb(0 0 0) 0px 0px 0px 2px'}),true);
 assert.equal(hasVisibleFocusStyle({outlineStyle:'solid',outlineWidth:'0px',boxShadow:'none'}),false);
});
