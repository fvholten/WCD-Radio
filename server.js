import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const requestedRoot = process.argv[2] ?? "dist";
const rootDir = resolveRootDirectory(requestedRoot);
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 4173);

function resolveRootDirectory(relativeRoot) {
  const absoluteRoot = path.resolve(projectRoot, relativeRoot);

  if (existsSync(path.join(absoluteRoot, "index.html"))) {
    return absoluteRoot;
  }

  return projectRoot;
}

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream";
}

function getSafePathname(url = "/") {
  const pathname = decodeURIComponent(url.split("?")[0]);
  const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");

  return normalized === path.sep ? "/index.html" : normalized;
}

async function resolveFilePath(requestUrl) {
  const safePathname = getSafePathname(requestUrl);
  const candidatePath = path.join(rootDir, safePathname);
  const fileStats = await stat(candidatePath).catch(() => null);

  if (fileStats?.isFile()) {
    return candidatePath;
  }

  if (fileStats?.isDirectory()) {
    const indexPath = path.join(candidatePath, "index.html");
    const indexStats = await stat(indexPath).catch(() => null);

    if (indexStats?.isFile()) {
      return indexPath;
    }
  }

  return null;
}

const server = http.createServer(async (request, response) => {
  const filePath = await resolveFilePath(request.url);

  if (!filePath) {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": getContentType(filePath),
    "Cache-Control": "no-store",
  });

  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving ${rootDir} on http://${host}:${port}`);
});
