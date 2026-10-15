const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oldsocks-key-test-"));
process.env.BACKUP_KEY_FILE = path.join(dir, "backup", "master.key");
const { decrypt, encrypt, ensureMasterKey } = require("../services/backups/secrets");

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test("anahtar yoksa şifreleme ve çözme durur, yeni anahtar üretilmez", async () => {
  await assert.rejects(encrypt("gizli"), (error) => error.code === "BACKUP_KEY_MISSING");
  assert.equal(fs.existsSync(process.env.BACKUP_KEY_FILE), false);
});

test("ilk kurulum anahtarı oluşturur, sonra şifreleme çalışır", async () => {
  await ensureMasterKey();
  const stat = fs.statSync(process.env.BACKUP_KEY_FILE);
  assert.equal(stat.mode & 0o777, 0o600);
  assert.equal((await decrypt(await encrypt({ a: 1 }))).a, 1);
});
