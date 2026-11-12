// D066: screenshot ONLY known own-panel content from synthetic localhost CI.
import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const t=process.env.RUNNER_TEMP,u=process.env.BB_VISUAL_URL;
if(process.env.CI!=="true"||!t||process.env.BB_DATA_DIR!==join(t,"d066-visual-data")||
   u!=="http://127.0.0.1:38887")throw Error("D066 non-disposable capture refused");
const baseline=JSON.parse(readFileSync("tests/parity/d066-visual-baselines.json","utf8"));
if(!["capture-only","locked"].includes(baseline.mode))throw Error("Invalid baseline mode");
const cases=[
  {id:"hello",nav:/suliko hello/i,labels:["Suliko Hello panel","სულიკო ჰელოს პანელი"]},
  {id:"remote-mock",nav:/suliko remote/i,labels:["Suliko Remote panel","სულიკო Remote პანელი"]},
];
const folder=join(t,"d066-own-panels");mkdirSync(folder,{recursive:true,mode:0o700});
const browser=await chromium.launch({headless:true});
try{
  for(const c of cases)for(const [i,lang] of ["en","ka-GE"].entries()){
    const context=await browser.newContext({locale:lang,serviceWorkers:"block",
      viewport:{width:1180,height:780},deviceScaleFactor:1,colorScheme:"light",reducedMotion:"reduce",timezoneId:"UTC"});
    try{
      const page=await context.newPage();
      await page.goto(u,{waitUntil:"domcontentloaded"});
      const projects=page.getByRole("button",{name:/projects?/i}).first();
      await projects.waitFor({state:"visible",timeout:20000});
      const skip=page.getByRole("button",{name:/skip setup/i}).first();
      if(await skip.isVisible().catch(()=>false))await skip.click();
      if(await projects.isEnabled().catch(()=>false)){
        await projects.click();
        const synthetic=page.getByText(/d066-visual-synthetic/i).first();
        if(await synthetic.waitFor({state:"visible",timeout:4000}).then(()=>true).catch(()=>false))
          await synthetic.click();
      }
      const nav=page.getByRole("link",{name:c.nav})
        .or(page.getByRole("button",{name:c.nav})).first();
      await nav.waitFor({state:"visible",timeout:20000});
      await page.evaluate(v=>{document.documentElement.lang=v;},lang);
      await nav.click();
      const panel=page.locator("section[aria-label]").filter({has:page.locator("h2")}).first();
      await panel.waitFor({state:"visible",timeout:15000});
      if(await panel.getAttribute("aria-label")!==c.labels[i])throw Error("Wrong synthetic locale");
      if(c.id==="hello"){
        await panel.getByRole("button",{name:/ping server|სერვერის შემოწმება/i})
          .waitFor({state:"visible",timeout:12000});
      }else{
        await panel.getByText("Demo Laptop",{exact:false}).waitFor({state:"visible",timeout:12000});
        const link=panel.getByRole("link",{name:/approval|თანხმობის/i}).first();
        const href=await link.getAttribute("href")??"";
        if(!/^https:\/\/remote\.example\.invalid\/approvals\/[a-zA-Z0-9_-]+$/.test(href))
          throw Error("Unsafe Remote mock link");
        if(await panel.getByRole("button",{name:/approve|დამტკიც/i}).count()>0)
          throw Error("In-IDE approval prohibited");
      }
      const txt=await panel.innerText();
      if(txt.length>2000||/(?:[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|sk-[a-z0-9_-]{16,}|gh[pso]_[a-z0-9]{16,}|bearer\s+\S+)/i.test(txt))
        throw Error("Non-synthetic own-panel content refused");
      await page.evaluate(()=>document.fonts.ready);
      const box=await panel.boundingBox();
      if(!box||box.width<170||box.width>1180||box.height<70||box.height>780||
         await panel.evaluate(el=>el.scrollWidth>el.clientWidth+2))
        throw Error("Invalid or clipped own-panel screenshot bounds");
      const key=c.id+"-"+(lang==="en"?"en":"ka");
      const bytes=await panel.screenshot({path:join(folder,key+".png"),type:"png",animations:"disabled",caret:"hide",scale:"css"});
      const digest=createHash("sha256").update(bytes).digest("hex");
      if(baseline.mode==="locked"&&baseline.hashes?.[key]!==digest)
        throw Error("Visual baseline mismatch: "+key);
      console.log("D066 synthetic own panel",key,"sha256="+digest,"bytes="+bytes.length,"mode="+baseline.mode);
    }finally{await context.close();}
  }
}finally{await browser.close();}
