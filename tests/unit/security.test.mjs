import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const headers = await readFile(new URL("../../_headers", import.meta.url), "utf8");
const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");

test("production headers enforce a strict same-origin baseline", () => {
  assert.match(headers, /Content-Security-Policy:/);
  assert.match(headers, /script-src 'self'/);
  assert.match(headers, /style-src 'self'/);
  assert.match(headers, /object-src 'none'/);
  assert.match(headers, /frame-ancestors 'none'/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /Strict-Transport-Security:/);
});

test("immutable caching is limited to content-hashed build assets", () => {
  assert.match(headers, /\/static\/\*/);
  assert.match(headers, /max-age=31556952, immutable/);
});

test("the application shell contains no inline executable content", () => {
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);
  assert.doesNotMatch(html, /<style\b/i);
  assert.doesNotMatch(html, /\sstyle=/i);
  assert.doesNotMatch(html, /<script[^>]*\bsrc=["']https?:\/\//i);
  assert.doesNotMatch(html, /<link[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']https?:\/\//i);
});
