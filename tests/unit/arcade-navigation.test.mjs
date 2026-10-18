import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
const source = readFileSync(new URL("../../game.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
test("menus, results and boot recovery have native Arcade exits", () => {
  assert.equal((html.match(/href="https:\/\/knockonwood\.studio\/arcade"/g) || []).length, 3);
  assert.match(source, /arcade\.href = "https:\/\/knockonwood\.studio\/arcade"/);
});
test("the result focus loop includes the Arcade anchor", () => {
  const first = { focus() { document.activeElement = first; } };
  const last = { focus() { document.activeElement = last; } };
  const document = { activeElement: last };
  const result = { querySelectorAll(selector) { assert.match(selector, /a\[href\]/); return [first, last]; } };
  const context = { document, el: { result }, resultShown: true };
  vm.createContext(context);
  const fn = source.slice(source.indexOf("  function trapResultFocus("), source.indexOf("  function snapCamera("));
  vm.runInContext(fn, context);
  let prevented = false;
  context.trapResultFocus({ key: "Tab", shiftKey: false, preventDefault() { prevented = true; } });
  assert.equal(document.activeElement, first);
  assert.equal(prevented, true);
  context.trapResultFocus({ key: "Tab", shiftKey: true, preventDefault() {} });
  assert.equal(document.activeElement, last);
});
