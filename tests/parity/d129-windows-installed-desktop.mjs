// D129: real official signed-status NotSigned, SHA256-pinned user NSIS executable.
// Only disposable public Windows-2022 CI; no local owners, real user data,
// provider keys, network to Remote, terminal commands, or BB source changes.
import { _electron, expect } from "@playwright/test";
import { basename, resolve, isAbsolute, sep } from "node:path";
const env=process.env;
const bin=env.D129_OFFICIAL_EXE, tmp=env.RUNNER_TEMP, data=env.BB_DATA_DIR;
if(env.CI!=="true"||env.GITHUB_ACTIONS!=="true"||env.RUNNER_OS!=="Windows"||
   env.BB_TELEMETRY!=="false"||!tmp||!bin||!isAbsolute(bin)||!data||
   !resolve(data).startsWith(resolve(tmp)+sep)||
   !basename(bin).toLowerCase().endsWith("bb.exe")||
   env.D129_BB_WEB_URL!=="http://127.0.0.1:38895/") {
 throw Error("D129 refuses non-disposable official native Windows Electron test");
}
const app=await _electron.launch({executablePath:resolve(bin),args:[],timeout:45000,env:{
 ...env,
 BB_DATA_DIR:data,
 BB_SERVER_BIND_HOST:"127.0.0.1",
 BB_SERVER_PORT:"38895",
 BB_HOST_DAEMON_PORT:"38896",
 BB_DESKTOP_APP_URL:"http://127.0.0.1:38895",
 BB_DESKTOP_ATTACH_WITHOUT_PROMPT:"1",
 BB_TELEMETRY:"false"
}});
try{
 const page=await app.firstWindow();
 const projects=page.getByRole("button",{name:/projects?/i}).first();
 await projects.waitFor({state:"visible",timeout:45000});
 const skip=page.getByRole("button",{name:/skip setup/i}).first();
 if(await skip.isVisible().catch(()=>false))await skip.click();
 const nav=page.getByRole("link",{name:/suliko hello/i})
  .or(page.getByRole("button",{name:/suliko hello/i})).first();
 await expect(nav).toBeVisible({timeout:35000});
 await nav.click();
 await expect(page.getByLabel("Suliko Hello panel")).toBeVisible({timeout:20000});
 console.log("D129_OFFICIAL_INSTALLED_HELLO_OWN_PANEL_VISIBLE=PASS");
 // A real GUI must remain alive for 15s after mounting; not just launch.
 await page.waitForTimeout(15000);
 if(app.process().exitCode!==null||page.isClosed())
  throw Error("D129 installed official Electron process did not stay alive");
 await expect(page.getByLabel("Suliko Hello panel")).toBeVisible();
 console.log("D129_INSTALLED_ELECTRON_GUI_LIVENESS_15S=PASS");
}finally{await app.close();}
