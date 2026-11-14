import test from "node:test";
import assert from "node:assert/strict";
import { lintWorkflowExpressions } from "./d152-workflow-expression-check.mjs";
const prefix="$"+"{{";
const escaped="\\"+prefix;
test("real native matrix expression passes",()=>{
  assert.deepEqual(lintWorkflowExpressions("sample.yml","runs-on: "+prefix+" matrix.os }}"),[]);
});
test("escaped runner expression fails closed",()=>{
  const r=lintWorkflowExpressions("sample.yml","name: test\nruns-on: "+escaped+" matrix.os }}");
  assert.deepEqual(r,["escaped-expression:runs-on:line-2"]);
});
test("escaped concurrency expression is rejected",()=>{
  const r=lintWorkflowExpressions("sample.yml","concurrency:\n  group: ci-"+escaped+" github.ref }}");
  assert.deepEqual(r,["escaped-expression:group:line-2"]);
});
test("untrusted shell strings are neither echoed nor blocked",()=>{
  const s="steps:\n - run: echo '"+escaped+" private.invalid }}'";
  assert.deepEqual(lintWorkflowExpressions("sample.yml",s),[]);
});
test("empty runner and malformed source extension fail closed",()=>{
  assert.deepEqual(lintWorkflowExpressions("sample.yml","runs-on:  "),["empty-runner:line-1"]);
  assert.deepEqual(lintWorkflowExpressions("x.txt","runs-on: ubuntu-24.04"),["unsupported-workflow-input"]);
});
