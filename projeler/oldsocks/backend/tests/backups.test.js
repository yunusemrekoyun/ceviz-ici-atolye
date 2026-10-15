const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { makeRecoveryKit, openRecoveryKit } = require("../services/backups/secrets");
const { mergedSizes } = require("../services/backups/restore");
const { verifyMediaInStage, verifyMediaTree } = require("../services/backups/media");

test("kurtarma kiti yalnızca doğru parola ile açılır", async () => {
  const payload = {
    version: 1,
    repository: "rclone:test:repo",
    rcloneConfig: "[test]\ntype = drive\n",
    resticPassword: "example-password",
    masterKey: Buffer.alloc(32, 7).toString("base64"),
  };
  const kit = await makeRecoveryKit(payload, "uzun-ve-ayri-bir-parola-123");
  assert.deepEqual(await openRecoveryKit(kit, "uzun-ve-ayri-bir-parola-123"), payload);
  await assert.rejects(openRecoveryKit(kit, "yanlis-parola-123456"));
  assert.equal(JSON.stringify(kit).includes(payload.resticPassword), false);
});

test("katalog geri yüklemesi mevcut stokları korur, eski ürünü sıfır stokla getirir", () => {
  const historic = { sizes: [{ size: "S", stock: 7 }, { size: "M", stock: 9 }] };
  const current = { sizes: [{ size: "S", stock: 2 }, { size: "L", stock: 4 }] };
  assert.deepEqual(mergedSizes(historic, current).map((item) => [item.size, item.stock]), [
    ["S", 2], ["M", 0], ["L", 4],
  ]);
  assert.deepEqual(mergedSizes(historic, null).map((item) => item.stock), [0, 0]);
});

test("medya dosyaları eksikse yedek geçerli sayılmaz", async (t) => {
  const stage = await fs.mkdtemp(path.join(os.tmpdir(), "oldsocks-media-test-"));
  t.after(() => fs.rm(stage, { recursive: true, force: true }));
  for (const name of ["assets", "trash", "quarantine"]) {
    await fs.mkdir(path.join(stage, "media", name), { recursive: true });
  }
  const archive = { collections: [{ name: "mediaassets", documents: [{
    status: "ready", manifestKey: "abc/manifest.json", variants: [{ key: "abc/image.webp" }],
  }] }] };
  await assert.rejects(verifyMediaInStage({ collections: [] }, stage), /no media asset collection/);
  assert.deepEqual(await verifyMediaTree(stage), { files: 0, bytes: 0 });
  await assert.rejects(verifyMediaInStage(archive, stage), { code: "ENOENT" });
  await fs.mkdir(path.join(stage, "media", "assets", "abc"));
  await fs.writeFile(path.join(stage, "media", "assets", "abc", "manifest.json"), "{}");
  await fs.writeFile(path.join(stage, "media", "assets", "abc", "image.webp"), "x");
  assert.deepEqual(await verifyMediaInStage(archive, stage), { readyAssets: 1, referencedFiles: 2 });
});

test("medya ağacındaki sembolik bağlantı reddedilir", async (t) => {
  const stage = await fs.mkdtemp(path.join(os.tmpdir(), "oldsocks-media-test-"));
  t.after(() => fs.rm(stage, { recursive: true, force: true }));
  for (const name of ["assets", "trash", "quarantine"]) {
    await fs.mkdir(path.join(stage, "media", name), { recursive: true });
  }
  await fs.symlink(os.tmpdir(), path.join(stage, "media", "assets", "outside"));
  await assert.rejects(verifyMediaTree(stage), /link or unsupported/);
});

test("yedek hazırlığı medyayı kopyalamadan sabit bağlantıyla alır; olmayan klasör boş oluşur", async (t) => {
  const { linkTree } = require("../services/backups/jobs");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "oldsocks-link-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "src", "a", "b"), { recursive: true });
  await fs.writeFile(path.join(root, "src", "a", "b", "w640.webp"), "gorsel");
  await linkTree(path.join(root, "src"), path.join(root, "hedef"));
  const [source, linked] = await Promise.all([
    fs.stat(path.join(root, "src", "a", "b", "w640.webp")),
    fs.stat(path.join(root, "hedef", "a", "b", "w640.webp")),
  ]);
  assert.equal(linked.ino, source.ino);
  assert.equal(await fs.readFile(path.join(root, "hedef", "a", "b", "w640.webp"), "utf8"), "gorsel");
  await linkTree(path.join(root, "yok"), path.join(root, "bos"));
  assert.deepEqual(await fs.readdir(path.join(root, "bos")), []);
});
