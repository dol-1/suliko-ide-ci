import {openOwnPanelByKeyboard,verifyOwnPanelKeyboard} from './d249-keyboard-own-panels.mjs';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
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
    const context=await browser.newContext({serviceWorkers:"block",locale:lang,viewport:{width:1180,height:780}});
    const page=await context.newPage();
    try {
      // A document-start script can run before <html> exists; BB may also
      // hydrate its root lang after that script. Use browser locale and then
      // set the synthetic language once DOM exists, before mounting Hello.
      // Keep the strict exact accessible-label check in both languages.
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
      // HelloPanel reads document.documentElement.lang on initial mount.
      // Set it only after stock BB hydration, immediately before opening
      // the panel. This is a synthetic locale switch, not proof of a real
      // app-level language setting or persistence across reloads.
      await page.evaluate(language=>{document.documentElement.lang=language;},lang);
      if(await page.evaluate(()=>document.documentElement.lang)!==lang)
        throw Error("D066 synthetic browser locale could not be applied");
      await openOwnPanelByKeyboard(page,nav);
      const panel=page.locator("section[aria-label]").filter({has:page.locator("h2")}).first();
      await panel.waitFor({state:"visible",timeout:10000});
      const actual=await panel.getAttribute("aria-label");
      if(actual!==label)throw Error("Wrong panel locale/accessible label for "+lang);
      await verifyOwnPanelKeyboard(page,panel,{kind:'hello'});
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
      const ownText=await panel.innerText();
      if(ownText.length>2200||/(?:sk-[a-z0-9_-]{16,}|gh[pso]_[a-z0-9]{16,}|bearer\s+\S+)/i.test(ownText))
        throw Error("D227 refused non-synthetic Web panel screenshot text");
      const shots=join(process.env.RUNNER_TEMP||"/invalid","d227-web-own-panels");
      mkdirSync(shots,{recursive:true,mode:0o700});
      for(const width of [375,1180]){
        await page.setViewportSize({width,height:width===375?812:800});
        if(await panel.evaluate(x=>x.scrollWidth>x.clientWidth+2))
          throw Error("D227 localized Web panel clips at "+width);
        const pixels=await panel.screenshot({path:join(shots,"hello-"+(lang==="en"?"en":"ka")+"-"+width+"px.png"),animations:"disabled",caret:"hide",scale:"css"});
        if(pixels.length<1000||pixels.length>1000000)throw Error("D227 Web panel screenshot size invalid");
        console.log("D227 Web synthetic localized panel hello",lang,width,"bytes",pixels.length);
      }
    } finally {await context.close();}
  }
} finally {await browser.close();}
