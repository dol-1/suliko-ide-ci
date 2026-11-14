// D-117: Browser + genuinely packaged Desktop surface for immutable RC Git marketplace install.
// Only disposable official BB 0.49.0, loopback services and an explicitly approved tag.
// Strictly no provider keys, shell commands in terminal, screenshot or external Remote.
import { chromium, _electron, expect } from "@playwright/test";
import { basename, join, resolve } from "node:path";
const tmp=process.env.RUNNER_TEMP;
const data=process.env.BB_DATA_DIR, bin=process.env.BB_DESKTOP_BINARY;
if(process.env.CI!=="true" || !tmp || data!==join(tmp,"d117-rc-bb-data")
   || !bin || !basename(bin).endsWith(".AppImage")
   || process.env.BB_TELEMETRY!=="false"){
  throw Error("D117 refuses non-disposable RC E2E");
}
async function assertOwnPanel(page, target){
  const projects=page.getByRole("button",{name:/projects?/i}).first();
  await projects.waitFor({state:"visible",timeout:45000});
  const skip=page.getByRole("button",{name:/skip setup/i}).first();
  if(await skip.isVisible().catch(()=>false))await skip.click();
  const nav=page.getByRole("link",{name:/suliko hello/i})
    .or(page.getByRole("button",{name:/suliko hello/i})).first();
  await expect(nav).toBeVisible({timeout:30000});
  await nav.click();
  await expect(page.getByLabel("Suliko Hello panel")).toBeVisible({timeout:15000});
  console.log("D117 RC tagged marketplace installed real own-panel:",target,"PASS");
}
const browser=await chromium.launch({headless:true});
try{
  const ctx=await browser.newContext({serviceWorkers:"block"});
  try{
    const page=await ctx.newPage();
    await page.goto("http://127.0.0.1:38886/",{waitUntil:"domcontentloaded"});
    await assertOwnPanel(page,"web");
  }finally{await ctx.close();}
}finally{await browser.close();}
const app=await _electron.launch({executablePath:resolve(bin),args:[],env:{
  ...process.env,
  BB_DATA_DIR:data,
  BB_SERVER_BIND_HOST:"127.0.0.1",
  BB_SERVER_PORT:"38886",
  BB_HOST_DAEMON_PORT:"38889",
  BB_DESKTOP_APP_URL:"http://127.0.0.1:38886",
  BB_DESKTOP_ATTACH_WITHOUT_PROMPT:"1",
  APPIMAGE_EXTRACT_AND_RUN:"1",
  BB_TELEMETRY:"false"
}});
try{
  await assertOwnPanel(await app.firstWindow(),"desktop");
}finally{await app.close();}
