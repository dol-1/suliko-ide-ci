// E9 D066 installed own Remote MOCK panel, no Remote service/network/token.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const url=new URL(process.env.BB_A11Y_URL??"");
if(url.protocol!=="http:"||!["localhost","127.0.0.1"].includes(url.hostname))throw Error("Only disposable HTTP loopback allowed");
const locales=[
  {lang:"en",panelLabel:"Suliko Remote panel"},
  {lang:"ka-GE",panelLabel:"სულიკო Remote პანელი"},
];
const browser=await chromium.launch({headless:true});
try {
  for(const {lang,panelLabel} of locales) {
    const context=await browser.newContext({serviceWorkers:"block",locale:lang,viewport:{width:1180,height:780}});
    try {
      const page=await context.newPage();
      await page.goto(url.toString(),{waitUntil:"domcontentloaded"});
      const projects=page.getByRole("button",{name:/projects?/i}).first();
      await projects.waitFor({state:"visible",timeout:18000});
      const skip=page.getByRole("button",{name:/skip setup/i}).first();
      if(await skip.isVisible().catch(()=>false))await skip.click();
      if(await projects.isEnabled().catch(()=>false)) {
        await projects.click();
        const synthetic=page.getByText(/qa01-synthetic/i).first();
        if(await synthetic.waitFor({state:"visible",timeout:3500}).then(()=>true).catch(()=>false))
          await synthetic.click();
      }
      const nav=page.getByRole("link",{name:/suliko remote/i})
        .or(page.getByRole("button",{name:/suliko remote/i})).first();
      await nav.waitFor({state:"visible",timeout:18000});
      // Simulates a browser locale, NOT a real BB language-setting or persistence.
      // The panel reads documentElement.lang during mount; stock BB hydrates first.
      await page.evaluate(language=>{document.documentElement.lang=language;},lang);
      if(await page.evaluate(()=>document.documentElement.lang)!==lang)throw Error("Synthetic locale not applied");
      await nav.click();
      const panel=page.locator("section[aria-label]").filter({has:page.locator("h2")}).first();
      await panel.waitFor({state:"visible",timeout:10000});
      const actual=await panel.getAttribute("aria-label");
      if(actual!==panelLabel)throw Error("Wrong Remote MOCK panel locale label: "+lang);
      const link=panel.getByRole("link",{name:/approval|თანხმობის/i}).first();
      await link.waitFor({state:"visible",timeout:10000});
      const href=await link.getAttribute("href");
      const target=await link.getAttribute("target");
      const rel=await link.getAttribute("rel")??"";
      if(!href||!/^https:\/\/remote\.example\.invalid\/approvals\/[a-zA-Z0-9_-]+$/.test(href)||
          target!=="_blank"||!rel.split(/\s+/).includes("noopener")||!rel.split(/\s+/).includes("noreferrer"))
        throw Error("Remote MOCK approval link must be unresolvable and safe");
      if(await panel.getByRole("button",{name:/approve|დამტკიც/i}).count()>0)
        throw Error("Remote MOCK UI must never contain an approval button");
      const result=await new AxeBuilder({page}).include("section[aria-label]")
        .withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"]).analyze();
      const critical=result.violations.filter(v=>v.impact==="critical");
      const serious=result.violations.filter(v=>v.impact==="serious");
      const clipping=await panel.evaluate(x=>x.scrollWidth>x.clientWidth+2);
      // No DOM, screen capture, raw axe nodes, credentials, paths, or text printed.
      console.log("D066 installed Remote MOCK Web",lang,"critical",critical.length,
        "serious",serious.length,"incomplete",result.incomplete.length,
        "horizontal-clipping",clipping,"safe-demo-link",true);
      if(critical.length||clipping)throw Error("D066 Remote MOCK a11y/clipping gate failed: "+lang);
    } finally {await context.close();}
  }
} finally {await browser.close();}
