// Derleme çıktısındaki metin dosyalarının .gz kopyalarını üretir.
// Nginx "gzip_static on" ile bunları doğrudan sunar; istek başına sıkıştırma yapılmaz.
// Kullanım: node scripts/precompress.mjs dist
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

const root = path.resolve(process.argv[2] || "dist");
const EXTENSIONS = new Set([".js", ".css", ".html", ".svg", ".json", ".webmanifest", ".txt", ".xml"]);
const MIN_BYTES = 1024;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let count = 0;
let before = 0;
let after = 0;
for await (const file of walk(root)) {
  if (!EXTENSIONS.has(path.extname(file))) continue;
  const { size } = await stat(file);
  if (size < MIN_BYTES) continue;
  const gz = zlib.gzipSync(await readFile(file), { level: 9 });
  if (gz.length >= size) continue;
  await writeFile(`${file}.gz`, gz);
  count += 1;
  before += size;
  after += gz.length;
}
console.log(`precompress: ${count} dosya, ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB (.gz)`);
