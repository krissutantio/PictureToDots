import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const files = (await readdir("dist/assets")).map((x) => "./assets/" + x);
const version = createHash("sha256")
  .update(await readFile("dist/index.html"))
  .update(await readFile("dist/vision/model-worker.js"))
  .update(await readFile("dist/manifest.webmanifest"))
  .update(await readFile("dist/icons/apple-touch-icon.png"))
  .update(await readFile("dist/icons/app-192.png"))
  .update(await readFile("dist/icons/app-512.png"))
  .update(await readFile("dist/icons/app.svg"))
  .digest("hex")
  .slice(0, 12);
await writeFile(
  "dist/sw.js",
  `const CACHE='paper-pigment-${version}';
const ASSETS=${JSON.stringify(["./", "./index.html", "./manifest.webmanifest", "./icons/app.svg", "./icons/app-192.png", "./icons/app-512.png", "./icons/apple-touch-icon.png", ...files])};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('paper-pigment-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(response=>{if(response.ok&&new URL(e.request.url).pathname.includes('/vision/')){const copy=response.clone();e.waitUntil(caches.open(CACHE).then(cache=>cache.put(e.request,copy)));}return response;})));});`,
);
