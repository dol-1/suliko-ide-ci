// D066 Web-only accessibility audit against installed own Hello panel on stock BB.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const target=new URL(process.env.BB_A11Y_URL??"");
if(target.protocol!=="http:"||!["127.0.0.1","localhost"].includes(target.hostname))throw Error("Only disposable HTTP loopback is allowed");
const browser=await chromium.launch({headless:true});
const locales=[
  {lang:"en",label:"Suliko Hello panel"},
  {lang:"ka-GE",label:"სულიკო ჰელოს პანელი"}
];
try {
  for(const {lang,label} of locales) {
    const context=await browser.newContext({serviceWorkers:"block",viewport:{width:1180,height:780}});
    const page=await context.newPage();
    try {
      await page.addInitScript(language=>document.documentElement.setAttribute("lang",language),lang);
      await page.goto(target.toString(),{waitUntil:"domcontentloaded"});
      const projects=page.getByRole("button",{name:/projects?/i}).first();
      await projects.waitFor({state:"visible",timeout:18000});
      const skip=page.getByRole("button",{name:/skip setup/i}).first();
      if(await skip.isVisible().catch(()=>false))await skip.click();
      if(await projects.isVisible().catch(()=>false)) {
        await projects.click();
        const synthetic=page.getByText(/qa01-synthetic/i).first();
        if(await synthetic.waitFor({state:"visible",timeout:3500}).then(()=>true).catch(()=>false))await synthetic.click();
      }
      const nav=page.getByRole("link",{name:/suliko hello/i})
        .or(page.getByRole("button",{name:/suliko hello/i})).first();
      await nav.waitFor({state:"visible",timeout:18000});
      await nav.click();
      const panel=page.locator("section[aria-label]").filter({has:page.locator("h2")}).first();
      await panel.waitFor({state:"visible",timeout:10000});
      const actual=await panel.getAttribute("aria-label");
      if(actual!==label)throw Error("Wrong panel locale/accessible label for "+lang);
      const outcome=await new AxeBuilder({page}).include("section[aria-label]")
        .withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"]).analyze();
      const critical=outcome.violations.filter(v=>v.impact==="critical");
      const serious=outcome.violations.filter(v=>v.impact==="serious");
      const clips=await panel.evaluate(element=>element.scrollWidth>element.clientWidth+2);
      // Do not print violation node snippets, DOM/paths or any collected content.
      console.log("D066 Web Hello",lang,"critical",critical.length,
        "serious",serious.length,"incomplete",outcome.incomplete.length,
        "horizontal-clipping",clips);
      if(critical.length||clips)
        throw Error("D066 localized Hello failed critical axe or clipping gate: "+lang);
    } finally {await context.close();}
  }
} finally {await browser.close();}
