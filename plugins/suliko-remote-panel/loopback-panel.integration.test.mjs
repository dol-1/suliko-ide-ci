// @vitest-environment jsdom
// D103: actual disposable HTTP -> shipped React component via test-only read port.
// No live Remote, auth, provider settings, controller, write or approval authority.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createServer } from "node:http";
import React from "react";
import { RemotePanel } from "./app.js";
import { createTestOnlyLoopbackReader } from "./loopback-test-reader.js";

describe("D103 actual loopback GET reader rendered in own mounted Remote React panel", () => {
  let server;
  let url;
  let mode;
  let observed;
  beforeEach(async () => {
    document.documentElement.lang="en";
    mode="normal";
    observed=[];
    server=createServer((req,res)=>{
      observed.push({method:req.method,path:req.url,hadAuth:req.headers.authorization!==undefined});
      if(req.method!=="GET"){res.writeHead(405).end();return;}
      if(mode==="error"){
        const payload=JSON.stringify({error:"sk-SYNTHETIC_NEVER_LEAK"});
        res.writeHead(503,{"content-type":"application/json","content-length":Buffer.byteLength(payload)}).end(payload);
        return;
      }
      const data=req.url==="/mock/devices"
        ? {devices:mode==="empty"?[]:[{id:"demo-device-1",label:"CI Fixture Laptop",status:"offline"}]}
        :req.url==="/mock/approvals/pending"
        ? {approvals:mode==="empty"?[]:[{id:"demo-approval-1",deviceId:"demo-device-1",label:"Synthetic Request",status:"pending",approvalPageUrl:mode==="bad-link"?"https://untrusted.example/approve":"https://remote.example.invalid/approvals/demo-approval-1"}]}
        :req.url==="/mock/approvals/demo-approval-1/status"
        ? {id:"demo-approval-1",status:"pending"}
        :req.url==="/mock/jobs/demo-job-1/status"
        ? {id:"demo-job-1",deviceId:"demo-device-1",status:mode==="malicious-job"?"approved":"unknown"}
        :null;
      if(data===null){res.writeHead(404).end();return;}
      const payload=JSON.stringify(data);
      res.writeHead(200,{"content-type":"application/json","content-length":Buffer.byteLength(payload)}).end(payload);
    });
    await new Promise((resolve,reject)=>{
      server.once("error",reject);
      server.listen(0,"127.0.0.1",resolve);
    });
    const address=server.address();
    if(!address||typeof address==="string")throw Error("No localhost socket");
    url="http://127.0.0.1:"+address.port+"/";
  });
  afterEach(async ()=>{
    cleanup();
    document.documentElement.lang="en";
    await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  });
  function mount() {
    render(React.createElement(RemotePanel,{readPort:createTestOnlyLoopbackReader(url)}));
  }
  function assertReadOnly(requireAll=false) {
    const allowed=[
      "/mock/approvals/demo-approval-1/status",
      "/mock/approvals/pending",
      "/mock/devices",
      "/mock/jobs/demo-job-1/status",
    ].sort();
    // On HTTP error the Promise.all may abort after 3 of 4 concurrent
    // requests; do NOT demand a fourth request after a failure. Preserve
    // strict endpoint, GET-only and no-auth safety on *every* observed request.
    expect(observed.length).toBeGreaterThan(0);
    expect(observed.length).toBeLessThanOrEqual(4);
    expect(observed.every(r=>r.method==="GET" && !r.hadAuth &&
      allowed.includes(r.path))).toBe(true);
    expect(new Set(observed.map(r=>r.path)).size).toBe(observed.length);
    if(requireAll) expect(observed.map(x=>x.path).sort()).toEqual(allowed);
    expect(screen.queryByRole("button",{name:/approve|execute|run command/i})).toBeNull();
  }
  it("renders real HTTP offline and unknown outcomes with external-only approval link",async()=>{
    mount();
    expect(await screen.findByText(/CI Fixture Laptop/)).toBeTruthy();
    expect(screen.getByText(/Outcome unknown/)).toBeTruthy();
    const link=screen.getByRole("link",{name:/Open Remote approval page/i});
    expect(link.getAttribute("href")).toBe("https://remote.example.invalid/approvals/demo-approval-1");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    assertReadOnly(true);
  });
  it("renders empty/no-approval in Georgian from actual GET replies",async()=>{
    document.documentElement.lang="ka-GE";
    mode="empty";
    mount();
    expect(await screen.findByText("ამ ჩანაწერში მოწყობილობები არ არის.")).toBeTruthy();
    expect(screen.getByText("მოლოდინში თანხმობა არ არის.")).toBeTruthy();
    expect(screen.queryByRole("link",{name:/approval|თანხმობის/i})).toBeNull();
    assertReadOnly(true);
  });
  it("redacts synthetic server failure text and refuses stale status",async()=>{
    mode="error";
    mount();
    const alert=await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/Unable to load demo data/);
    expect(document.body.textContent).not.toContain("sk-SYNTHETIC_NEVER_LEAK");
    expect(screen.queryByText(/CI Fixture Laptop/)).toBeNull();
    assertReadOnly();
  });
  it("rejects forged successful write outcome from HTTP",async()=>{
    mode="malicious-job";
    mount();
    await screen.findByRole("alert");
    expect(screen.queryByText(/Outcome unknown/)).toBeNull();
    assertReadOnly();
  });
  it("rejects external approval-link origins from HTTP without adding approval controls",async()=>{
    mode="bad-link";
    mount();
    await screen.findByRole("alert");
    expect(screen.queryByRole("link",{name:/approval|თანხმობის/i})).toBeNull();
    assertReadOnly();
  });
});
