import { test } from "node:test";
import assert from "node:assert/strict";
import { categoricalControls } from "./diagnose-controls-safe.mjs";

test("untrusted labels never appear in serialized diagnostic", () => {
  const token = "sk-" + "SYNTHETIC_NEVER_LOG_ABCDEFGHIJ";
  const mail = "synthetic-person@example.invalid";
  const path = "C:\\Users\\synthetic\\confidential";
  const diag = categoricalControls([token, mail, path,
    "New thread (Ctrl+N)", "Install Codex before starting a thread",
    "Provider, model and reasoning", "Suliko Hello"]);
  const text = JSON.stringify(diag);
  for (const secret of [token, mail, path, "Ctrl+N"]) {
    assert.ok(!text.includes(secret), "serialized output must not contain raw input");
  }
  assert.equal(diag.newThreadControl, true);
  assert.equal(diag.requiresCodexInstall, true);
  assert.equal(diag.providerPickerControl, true);
  assert.equal(diag.helloControl, true);
});

test("fixed names and strict boolean/number types", () => {
  const diag = categoricalControls(["Projects", "Terminal", "Files"]);
  assert.deepEqual(Object.keys(diag), [
    "observedControls", "projectsControl", "newThreadControl",
    "providerPickerControl", "helloControl", "filesOrDiffControl",
    "terminalControl", "requiresCodexInstall",
  ]);
  assert.equal(diag.projectsControl, true);
  assert.equal(diag.terminalControl, true);
  assert.equal(diag.filesOrDiffControl, true);
  for (const [key, value] of Object.entries(diag)) {
    assert.ok(key === "observedControls" ? Number.isInteger(value) : typeof value === "boolean");
  }
});

test("bounded input and nonstring objects fail closed", () => {
  const input = Array.from({ length: 500 }, () => "untrusted");
  input[499] = "Suliko Hello";
  const out = categoricalControls(input);
  assert.equal(out.observedControls, 60);
  assert.equal(out.helloControl, false);
  assert.equal(categoricalControls(null).observedControls, 0);
  const malformed = categoricalControls([null, { toString() { throw Error("must not evaluate"); } }]);
  assert.equal(malformed.observedControls, 2);
  assert.equal(malformed.newThreadControl, false);
});
