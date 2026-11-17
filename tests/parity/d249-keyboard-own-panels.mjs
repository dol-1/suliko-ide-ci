// D249: real keyboard-only access to our own installed plugin panels, not stock BB onboarding.
// Never activate Remote MOCK's external unresolvable approval link.
export function hasVisibleFocusStyle({outlineStyle,outlineWidth,boxShadow}){
 const px=Number.parseFloat(outlineWidth??'0');
 return (outlineStyle!=='none'&&outlineStyle!==undefined&&Number.isFinite(px)&&px>=1) ||
   (typeof boxShadow==='string'&&boxShadow!=='none'&&boxShadow.length>2);
}
export async function openOwnPanelByKeyboard(page,nav){
 await nav.waitFor({state:'visible',timeout:15000});
 await nav.focus();
 if(!await nav.evaluate(el=>el===document.activeElement))
   throw Error('D249_NAV_NOT_KEYBOARD_FOCUSABLE');
 await page.keyboard.press('Enter');
}
export async function verifyOwnPanelKeyboard(page,panel,{kind}){
 if(kind!=='hello'&&kind!=='remote')throw Error('D249_UNREVIEWED_PANEL');
 const control=kind==='hello'?panel.getByRole('button').first():panel.getByRole('link').first();
 await control.waitFor({state:'visible',timeout:15000});
 if(await control.isDisabled())throw Error('D249_PANEL_CONTROL_DISABLED');
 let focused=false;
 for(let n=0;n<100;n++){
   await page.keyboard.press('Tab');
   if(await control.evaluate(el=>el===document.activeElement)){focused=true;break}
 }
 if(!focused)throw Error('D249_OWN_PANEL_NOT_IN_KEYBOARD_TAB_ORDER');
 const style=await control.evaluate(el=>{
   const x=getComputedStyle(el);
   return {focused:el===document.activeElement,focusVisible:el.matches(':focus-visible'),
     outlineStyle:x.outlineStyle,outlineWidth:x.outlineWidth,boxShadow:x.boxShadow};
 });
 if(!style.focused||!style.focusVisible||!hasVisibleFocusStyle(style))
   throw Error('D249_FOCUSED_CONTROL_WITHOUT_VISIBLE_RING');
 if(kind==='hello'){
   // Keyboard Space activates ONLY our own explicit local read-only ping.
   await page.keyboard.press('Space');
   // A loading announcement is not success. Require the actual localized
   // read-only RPC result, then restore tab testing after the button enables.
   await panel.getByRole('status').filter({hasText:/Connected at|დაკავშირებულია:/})
     .waitFor({state:'visible',timeout:15000});
   if(!await control.isEnabled())throw Error('D249_HELLO_PING_DID_NOT_SETTLE');
 }else{
   // This is a read-only, intentionally invalid demo URL, NEVER follow it.
   const href=await control.getAttribute('href');
   if(!/^https:\/\/remote\.example\.invalid\/approvals\/[a-zA-Z0-9_-]+$/.test(href??''))
     throw Error('D249_REMOTE_MOCK_LINK_UNREVIEWED');
 }
 await page.keyboard.press('Tab');
 if(await control.evaluate(el=>el===document.activeElement))
   throw Error('D249_KEYBOARD_FOCUS_TRAP');
 await page.keyboard.press('Shift+Tab');
 if(!await control.evaluate(el=>el===document.activeElement))
   throw Error('D249_KEYBOARD_REVERSE_TAB_BROKEN');
 console.log('D249_OWN_'+kind.toUpperCase()+'_KEYBOARD_ENTRY_VISIBLE_FOCUS_NO_TRAP=PASS');
}
