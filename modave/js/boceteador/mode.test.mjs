import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveEditorMode } from "./mode.js";

test("resolveEditorMode maps simple only", () => {
  assert.equal(resolveEditorMode("simple"), "simple");
  assert.equal(resolveEditorMode("pro"), "pro");
  assert.equal(resolveEditorMode(undefined), "pro");
  assert.equal(resolveEditorMode(""), "pro");
  assert.equal(resolveEditorMode("foo"), "pro");
});
