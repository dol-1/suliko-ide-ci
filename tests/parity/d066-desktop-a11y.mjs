// E9 packaged Desktop isolated Linux smoke. No Remote service, user data, tokens or approvals.
import { _electron, expect } from "@playwright/test";
// AxeBuilder's Playwright multi-page helper is unsupported in Electron BrowserContext.
// Load the same axe-core browser engine directly into the existing renderer.
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const axeBrowserPath=(()=>{try{return require.resolve("axe-core/axe.min.js");}catch{return require.resolve("axe-core");}})();
import { basename, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
const bin=process.env.BB_DESKTOP_BINARY, tmp=process.env.RUNNER_TEMP, data=process.env.BB_DATA_DIR;
if(process.env.CI!=="true"||!bin||!tmp||data!==join(tmp,"d066-desktop-data")||
   !basename(bin).endsWith(".AppImage")||process.env.BB_TELEMETRY!=="false")
  throw Error("D066 refused non-disposable desktop fixture");
const screenshots=join(tmp,"d088-desktop-own-panels");
mkdirSync(screenshots,{recursive:true,mode:0o700});
for(const [lang,helloLabel,remoteLabel] of [
  ["en","Suliko Hello panel","Suliko Remote panel"],
  ["ka-GE","სულიკო ჰელოს პანელი","სულიკო Remote პანელი"]
]){
  const electron=await _electron.launch({executablePath:resolve(bin),args:[],env:{
    ...process.env,BB_DATA_DIR:data,BB_SERVER_BIND_HOST:"127.0.0.1",
    BB_SERVER_PORT:"38888",BB_HOST_DAEMON_PORT:"38890",
    BB_DESKTOP_APP_URL:"http://127.0.0.1:38888",
    BB_DESKTOP_ATTACH_WITHOUT_PROMPT:"1",APPIMAGE_EXTRACT_AND_RUN:"1",BB_TELEMETRY:"false"
  }});
  try{
    const page=await electron.firstWindow();
    const projects=page.getByRole("button",{name:/projects?/i}).first();
    await projects.waitFor({state:"visible",timeout:40000});
    const skip=page.getByRole("button",{name:/skip setup/i}).first();
    if(await skip.isVisible().catch(()=>false))await skip.click();
    // This disposable BB profile is reused across locales. The EN visit
    // already opens the synthetic project. Re-clicking its project label
    // during the second Electron attach targets a stale overlay (real
    // Desktop 43278630115: <html> intercepts pointer events for 30s).
    // This only avoids duplicate test setup, never skips any own panel gate.
    if(lang==="en" && await projects.isEnabled().catch(()=>false)){
      await projects.click();
      const project=page.getByText(/d066-desktop-synthetic/i).first();
      if(await project.waitFor({state:"visible",timeout:4000}).then(()=>true).catch(()=>false))
        await project.click();
    }
    for(const [id,label] of [["hello",helloLabel],["remote",remoteLabel]]){
      const pattern=id==="hello"?/suliko hello/i:/suliko remote/i;
      const nav=page.getByRole("link",{name:pattern}).or(page.getByRole("button",{name:pattern})).first();
      await nav.waitFor({state:"visible",timeout:30000});
      await page.evaluate(value=>{document.documentElement.lang=value;},lang);
      await nav.click();
      const panel=page.locator("section[aria-label]").filter({has:page.locator("h2")}).first();
      await panel.waitFor({state:"visible",timeout:15000});
      // Route navigation mounts panels asynchronously. Assert the exact
      // localized label with Playwright polling instead of sampling a stale
      // previous panel immediately after navigation (no assertion weakening).
      await expect(panel).toHaveAttribute("aria-label",label,{timeout:15000});
      if(id==="remote"){
        const link=panel.getByRole("link",{name:/approval|თანხმობის/i}).first();
        await link.waitFor({state:"visible",timeout:12000});
        if(!/^https:\/\/remote\.example\.invalid\/approvals\/[a-zA-Z0-9_-]+$/.test(await link.getAttribute("href")??""))
          throw Error("D066 unsafe Remote MOCK link");
        if(await panel.getByRole("button",{name:/approve|დამტკიც/i}).count()>0)
          throw Error("D066 in-IDE approval forbidden");
      }
      // Do not call AxeBuilder on Electron: it creates an unsupported newPage.
      // Native axe-core.run on the existing actual Electron renderer keeps all
      // original WCAG tags, critical-fail and clipping assertions unchanged.
      await page.addScriptTag({path:axeBrowserPath});
      const counts=await panel.evaluate(async element=>{
        if(!window.axe||typeof window.axe.run!=="function")throw Error("Axe engine did not load");
        const result=await window.axe.run(element,{runOnly:{type:"tag",values:
          ["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"]}});
        return {critical:result.violations.filter(x=>x.impact==="critical").length,
          serious:result.violations.filter(x=>x.impact==="serious").length,
          incomplete:result.incomplete.length};
      });
      const clipped=await panel.evaluate(x=>x.scrollWidth>x.clientWidth+2);
      console.log("D066 packaged Desktop own panel",id,lang,"critical",counts.critical,
        "serious",counts.serious,"incomplete",counts.incomplete,"clipping",clipped);
      if(counts.critical||clipped)throw Error("D066 Desktop own panel accessibility/clipping gate failed");
      // D088: only synthetic panel pixels; never screenshot entire BB workspace.
      const visibleText=await panel.innerText();
      if(visibleText.length>2000||/(?:[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}|sk-[a-z0-9_-]{16,}|gh[pso]_[a-z0-9]{16,}|bearer\\s+\\S+)/i.test(visibleText))
        throw Error("D088 refused non-synthetic Desktop screenshot content");
      const bounds=await panel.boundingBox();
      if(!bounds||bounds.width<170||bounds.width>1400||bounds.height<70||bounds.height>900)
        throw Error("D088 invalid own-panel screenshot bounds");
      const key=id+"-"+(lang==="en"?"en":"ka");
      const pixels=await panel.screenshot({path:join(screenshots,key+".png"),type:"png",animations:"disabled",caret:"hide",scale:"css"});
      if(pixels.length<1000||pixels.length>1000000)throw Error("D088 bounded screenshot bytes invalid");
      console.log("D088 packaged Desktop synthetic own panel",key,"SHA256",createHash("sha256").update(pixels).digest("hex"),"bytes",pixels.length);
    }
  }finally{await electron.close();}
}
