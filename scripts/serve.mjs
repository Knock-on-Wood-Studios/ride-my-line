import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] || "dist");
const port = Number.parseInt(process.argv[3] || "8765", 10);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json"
};

async function resolveFile(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  const normalized = normalize(pathname).replace(/^[/\\]+/, "");
  const requested = resolve(join(root, normalized || "index.html"));
  if (requested !== root && !requested.startsWith(`${root}/`)) return null;

  try {
    const details = await stat(requested);
    if (details.isFile()) return requested;
  } catch {}

  const fallback = join(root, "index.html");
  try {
    await access(fallback);
    return fallback;
  } catch {
    return null;
  }
}

const server = createServer(async (request, response) => {
  const file = await resolveFile(request.url || "/");
  if (!file) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": types[extname(file)] || "application/octet-stream"
  });
  createReadStream(file).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
