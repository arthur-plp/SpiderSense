// MapLibre resolves its web worker relative to its own module URL, which
// breaks once bundled. The worker is served from public/ instead
// (run automatically before `dev` and `build`).
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const source = path.join(path.dirname(require.resolve("maplibre-gl/package.json")), "dist", "maplibre-gl-worker.mjs");
const target = path.join(process.cwd(), "public", "vendor", "maplibre-gl-worker.mjs");

await mkdir(path.dirname(target), { recursive: true });
await copyFile(source, target);
console.log("MapLibre worker copied to public/vendor/");
