#!/usr/bin/env node
// D152: review public CI workflow dispatch expressions before GitHub mirror.
// A literal backslash before GitHub's expression prefix can leave jobs queued.
// No API calls, filesystem mutation, secrets or external network use.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
export const escapedPrefix = "\\" + "$" + "{{";
export function lintWorkflowExpressions(fileName, source) {
  if (typeof source !== "string" || !fileName.endsWith(".yml")) return ["unsupported-workflow-input"];
  const issues=[];
  for (const [i, line] of source.split(/\r?\n/u).entries()) {
    // Metadata only; shell heredoc strings are not evaluated by GitHub.
    const field=/^\s*(group|runs-on):\s*(.*?)\s*$/u.exec(line);
    if (!field) continue;
    if (field[2].includes(escapedPrefix)) issues.push("escaped-expression:" + field[1] + ":line-" + (i + 1));
    if (field[1]==="runs-on" && !field[2]) issues.push("empty-runner:line-" + (i + 1));
  }
  return issues;
}
export function scanWorkflowDirectory(dir) {
  const result=[];
  const files=readdirSync(dir).filter(f=>/\.ya?ml$/u.test(f)).sort();
  for (const file of files) {
    const source=readFileSync(join(dir,file),"utf8");
    const fileType=file.endsWith(".yaml")?file.replace(/\.yaml$/u,".yml"):file;
    for (const reason of lintWorkflowExpressions(fileType,source)) result.push({file,reason});
  }
  return {fileCount:files.length,errors:result};
}
if (process.argv[1]?.endsWith("d152-workflow-expression-check.mjs")) {
  try {
    const folder=process.argv[2] || ".github/workflows";
    const result=scanWorkflowDirectory(folder);
    for (const e of result.errors) console.error("D152_WORKFLOW_EXPR_REJECT "+e.file+" "+e.reason);
    if (result.errors.length) process.exitCode=1;
    else console.log("D152_WORKFLOW_EXPR_PASS workflow_count="+result.fileCount);
  } catch {
    console.error("D152_WORKFLOW_EXPR_REJECT scan-error");
    process.exitCode=1;
  }
}
