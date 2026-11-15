// D174: native Windows GUI-based, project-free official BB 0.49.0 proof.
// Pinned upstream BB CLI on Windows is supported only via WSL2; never
// fabricate a host ID or treat a Windows CLI failure as a GUI success.
import { _electron, expect } from "@playwright/test";
import { basename, resolve, isAbsolute, sep } from "node:path";
import { readFileSync, lstatSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const e=process.env,bin=e.D129_OFFICIAL_EXE,tmp=e.RUNNER_TEMP,data=e.BB_DATA_DIR;
const fail=()=>{throw Error("D174_FAIL_CLOSED native Windows GUI/SEC02");};
if(e.CI!=="true"||e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="dol-1/suliko-ide-ci"||
 e.RUNNER_OS!=="Windows"||e.BB_SERVER_BIND_HOST!=="127.0.0.1"||
 e.BB_TELEMETRY!=="false"||!tmp||!data||!bin||!isAbsolute(bin)||
 !resolve(data).startsWith(resolve(tmp)+sep)||
 basename(bin).toLowerCase()!=="bb.exe"||
 e.D129_BB_WEB_URL!=="http://127.0.0.1:38895/")fail();
const record=lstatSync(bin);
if(!record.isFile()||record.isSymbolicLink())fail();
const profile=readFileSync(resolve(e.GITHUB_WORKSPACE,"config","hardened",".env.hardened"),"utf8");
if(!/^BB_SERVER_BIND_HOST=127\.0\.0\.1$/m.test(profile)||
 !/^BB_TELEMETRY=false$/m.test(profile))fail();
console.log("D174_WINDOWS_GUI_SEC02_PINNED_FILE_PROFILE=PASS");
const app=await _electron.launch({executablePath:resolve(bin),args:[],timeout:60000,env:{
 ...e,BB_DATA_DIR:data,BB_SERVER_BIND_HOST:"127.0.0.1",BB_TELEMETRY:"false",
 BB_SERVER_PORT:"38895",BB_HOST_DAEMON_PORT:"38896",
 BB_DESKTOP_APP_URL:"http://127.0.0.1:38895",BB_DESKTOP_ATTACH_WITHOUT_PROMPT:"1"
}});
try{
 const page=await app.firstWindow();
 await page.waitForLoadState("domcontentloaded");
 console.log("D174_GUI_SAFE_STAGE=app-window-ready");
 // Keep the stock Electron app on the projectless Compose home.
 // Clicking the separate "Projects" navigation opens a page that lacks the
 // RootCompose prompt-box project picker. Do not click it on fresh installs.
 // Wait for the actual BB navigation shell before checking optional setup
 // and project controls. DOMContentLoaded alone is not React hydration.
 const projectsNav=page.getByRole("button",{name:/projects?/i}).first();
 await expect(projectsNav).toBeVisible({timeout:60000});
 console.log("D174_GUI_SAFE_STAGE=ui-shell-hydrated");
 const skip=page.getByRole("button",{name:/skip setup/i}).first();
 if(await skip.isVisible().catch(()=>false))await skip.click();
 console.log("D174_GUI_SAFE_STAGE=projectless-compose-home-ready");
 // Create a disposable git folder using only local filesystem + git.
 // Enroll it through the REAL official Electron GUI; never invoke the
 // unsupported native PowerShell stock BB 'project create' command.
 const project=resolve(tmp,"d165-owned-home","d174-windows-gui-synthetic");
 mkdirSync(project,{recursive:false});
 const git=spawnSync("git",["-C",project,"init","-b","main"],{
  windowsHide:true,stdio:"ignore",timeout:20000
 });
 if(git.status!==0)fail();
 // Pinned BB desktop-v0.49.0 exposes either the empty-home project CTA
 // or the ProjectSelector popover (button aria-label="Project: ..." plus
 // CommandItem value="new-project"). Both are native, real GUI surfaces.
 const direct=page.getByRole("button",{name:/New project/i}).first();
 const trigger=page.getByRole("button",{name:/^Project:/i}).first();
 let route=null;
 // Asynchronous genuine GUI hydration varies. Test both upstream-supported
 // create entrypoints; if none appear on Compose, use Projects nav only
 // when actually enabled (never force/disable/bypass the real UI).
 for(let i=0;i<65;i++){
  if(await direct.isVisible().catch(()=>false) && await direct.isEnabled().catch(()=>false)){
   route="direct";break;
  }
  if(await trigger.isVisible().catch(()=>false) && await trigger.isEnabled().catch(()=>false)){
   route="selector";break;
  }
  if(i===25 && await projectsNav.isEnabled().catch(()=>false)){
   await projectsNav.click();
   console.log("D174_GUI_SAFE_STAGE=projects-page-ready");
  }
  await page.waitForTimeout(1000);
 }
 if(route==="direct"){
  await direct.click();
 }else if(route==="selector"){
  await trigger.click();
  const action=page.getByRole("option",{name:"New project"}).first();
  await expect(action).toBeVisible({timeout:20000});
  await expect(action).toBeEnabled({timeout:20000});
  await action.click();
 }else fail();
 console.log("D174_GUI_SAFE_STAGE=entry-found");
 const dialog=page.getByRole("dialog",{name:/Add project/i});
 await expect(dialog).toBeVisible({timeout:20000});
 console.log("D174_GUI_SAFE_STAGE=dialog-open");
 const edit=dialog.getByRole("button",{name:"Edit path"});
 await expect(edit).toBeVisible({timeout:20000});
 await edit.click();
 console.log("D174_GUI_SAFE_STAGE=folder-editor-open");
 await dialog.getByRole("textbox",{name:"Project path"}).fill(project);
 await dialog.getByRole("button",{name:"Go to path"}).click();
 await expect(dialog.getByText("d174-windows-gui-synthetic")).toBeVisible({timeout:30000});
 console.log("D174_GUI_SAFE_STAGE=path-go-confirmed");
 const add=dialog.getByRole("button",{name:"Add project"});
 await expect(add).toBeEnabled({timeout:15000});
 await add.click();
 await expect(dialog).toBeHidden({timeout:30000});
 console.log("D174_GUI_SAFE_STAGE=gui-project-added");
 console.log("D174_WINDOWS_SYNTHETIC_GUI_PROJECT_ENROLLMENT=PASS");
 const nav=page.getByRole("link",{name:/suliko hello/i})
  .or(page.getByRole("button",{name:/suliko hello/i})).first();
 await expect(nav).toBeVisible({timeout:60000});
 console.log("D174_GUI_SAFE_STAGE=hello-nav-visible");
 await nav.click();
 const panel=page.getByLabel("Suliko Hello panel");
 await expect(panel).toBeVisible({timeout:30000});
 console.log("D174_GUI_SAFE_STAGE=hello-panel-visible");
 console.log("D174_WINDOWS_REAL_OFFICIAL_GUI_HELLO_PANEL=PASS");
 await page.waitForTimeout(15000);
 if(app.process().exitCode!==null||page.isClosed())fail();
 await expect(panel).toBeVisible();
 console.log("D174_WINDOWS_REAL_GUI_HELLO_LIVENESS_15S=PASS");
}finally{await app.close();}
