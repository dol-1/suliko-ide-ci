// E9 packaged Desktop isolated Linux smoke. No Remote service, user data, tokens or approvals.
import { _electron } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { basename, join, resolve } from "node:path";
const bin=process.env.BB_DESKTOP_BINARY, tmp=process.env.RUNNER_TEMP, data=process.env.BB_DATA_DIR;
if(process.env.CI!=="true"||!bin||!tmp||data!==join(tmp,"d066-desktop-data")||
   !basename(bin).endsWith(".AppImage")||process.env.BB_TELEMETRY!=="false")
  throw Error("D066 refused non-disposable desktop fixture");
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
    if(await projects.isEnabled().catch(()=>false)){
      await projects.click();
      const project=page.getByText(/d066-desktop-synthetic/i).first();
      if(await project.waitFor({state:"visible",timeout:4000}).then(()=>true).catch(()=>false))await project.click();
    }
    for(const [id,label] of [["hello",helloLabel],["remote",remoteLabel]]){
      const pattern=id==="hello"?/suliko hello/i:/suliko remote/i;
      const nav=page.getByRole("link",{name:pattern}).or(page.getByRole("button",{name:pattern})).first();
      await nav.waitFor({state:"visible",timeout:30000});
      await page.evaluate(value=>{document.documentElement.lang=value;},lang);
      await nav.click();
      const panel=page.locator("section[aria-label]").filter({has:page.locator("h2")}).first();
      await panel.waitFor({state:"visible",timeout:15000});
      if(await panel.getAttribute("aria-label")!==label)throw Error("D066 wrong Desktop localized label");
      if(id==="remote"){
        const link=panel.getByRole("link",{name:/approval|თანხმობის/i}).first();
        await link.waitFor({state:"visible",timeout:12000});
        if(!/^https:\/\/remote\.example\.invalid\/approvals\/[a-zA-Z0-9_-]+$/.test(await link.getAttribute("href")??""))
          throw Error("D066 unsafe Remote MOCK link");
        if(await panel.getByRole("button",{name:/approve|დამტკიც/i}).count()>0)
          throw Error("D066 in-IDE approval forbidden");
      }
      const audit=await new AxeBuilder({page}).include("section[aria-label]")
        .withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"]).analyze();
      const critical=audit.violations.filter(x=>x.impact==="critical");
      const serious=audit.violations.filter(x=>x.impact==="serious");
      const clipped=await panel.evaluate(x=>x.scrollWidth>x.clientWidth+2);
      console.log("D066 packaged Desktop own panel",id,lang,"critical",critical.length,
        "serious",serious.length,"incomplete",audit.incomplete.length,"clipping",clipped);
      if(critical.length||clipped)throw Error("D066 Desktop own panel accessibility/clipping gate failed");
    }
  }finally{await electron.close();}
}
