import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", root), "utf8"));
const html = await readFile(new URL("index.html", root), "utf8");
const robots = await readFile(new URL("robots.txt", root), "utf8");
const sitemap = await readFile(new URL("sitemap.xml", root), "utf8");
const legalPages = await Promise.all(["privacy", "terms", "support"].map(async (page) => ({
  page,
  html: await readFile(new URL(`${page}.html`, root), "utf8")
})));

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

test("production discovery and share metadata use the canonical public URL", () => {
  const publicUrl = "https://ride-my-line.robertwood50.workers.dev/";
  assert.match(html, new RegExp(`<link rel="canonical" href="${publicUrl}"`));
  assert.match(html, new RegExp(`property="og:url" content="${publicUrl}"`));
  assert.match(html, /property="og:image" content="https:\/\/ride-my-line\.robertwood50\.workers\.dev\/assets\/brand\/ride-my-line-share\.png"/);
  assert.match(robots, /Sitemap: https:\/\/ride-my-line\.robertwood50\.workers\.dev\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/ride-my-line\.robertwood50\.workers\.dev\/<\/loc>/);
  assert.doesNotMatch(sitemap, /\.html<\/loc>/);
  for (const item of legalPages) {
    assert.match(item.html, new RegExp(`<link rel="canonical" href="${publicUrl}${item.page}"`));
    assert.match(sitemap, new RegExp(`<loc>${publicUrl}${item.page}</loc>`));
  }
});

test("player-facing privacy, terms, and support pages are checked in", async () => {
  for (const filename of ["privacy.html", "terms.html", "support.html"]) {
    const html = await readFile(new URL(filename, root), "utf8");
    assert.match(html, /<title>.+Ride My Line<\/title>/);
    assert.doesNotMatch(html, /\sstyle=/i);
    assert.doesNotMatch(html, /<script/i);
  }
});
