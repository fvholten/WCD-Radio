import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputDir = path.join(projectRoot, "dist");
const filesToCopy = ["index.html", "app.js", "radio.js", "styles.css"];

await rm(outputDir, { force: true, recursive: true });
await mkdir(outputDir, { recursive: true });

for (const file of filesToCopy) {
  await cp(path.join(projectRoot, file), path.join(outputDir, file));
}

console.log(`Built ${filesToCopy.length} files into ${outputDir}`);
