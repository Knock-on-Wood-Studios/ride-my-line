import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", root), "utf8"));

test("the install manifest has a stable identity and complete icon set", async () => {
  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.name, "Ride My Line");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
  await Promise.all(manifest.icons.map((icon) => access(new URL(icon.src.slice(1), root))));
});

test("player-facing privacy, terms, and support pages are checked in", async () => {
  for (const filename of ["privacy.html", "terms.html", "support.html"]) {
    const html = await readFile(new URL(filename, root), "utf8");
    assert.match(html, /<title>.+Ride My Line<\/title>/);
    assert.doesNotMatch(html, /\sstyle=/i);
    assert.doesNotMatch(html, /<script/i);
  }
});
