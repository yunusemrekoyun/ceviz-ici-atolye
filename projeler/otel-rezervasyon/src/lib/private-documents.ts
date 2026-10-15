import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const MAGIC = Buffer.from('WNC1');
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function privateRoot() {
  return process.env.PRIVATE_UPLOAD_ROOT
    ? path.resolve(process.env.PRIVATE_UPLOAD_ROOT)
    : path.join(process.cwd(), '.private', 'uploads');
}

function documentKey() {
  const raw = process.env.CHECKIN_DOCUMENT_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('CHECKIN_DOCUMENT_ENCRYPTION_KEY is missing.');
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('CHECKIN_DOCUMENT_ENCRYPTION_KEY must be a 32 byte base64 value.');
  }

  return key;
}

function safePath(relativePath: string) {
  const root = privateRoot();
  const fullPath = path.resolve(root, relativePath);
  if (!fullPath.startsWith(root + path.sep)) {
    throw new Error('Invalid private document path.');
  }
  return fullPath;
}

export async function saveEncryptedDocument(buffer: Buffer, relativePath: string) {
  const fullPath = safePath(relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', documentKey(), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  await fs.writeFile(fullPath, Buffer.concat([MAGIC, iv, tag, encrypted]), { mode: 0o600 });
}

export async function readEncryptedDocument(relativePath: string) {
  const payload = await fs.readFile(safePath(relativePath));
  const magic = payload.subarray(0, MAGIC.length);
  if (!magic.equals(MAGIC)) throw new Error('Invalid encrypted document.');

  const ivStart = MAGIC.length;
  const tagStart = ivStart + IV_LENGTH;
  const dataStart = tagStart + TAG_LENGTH;
  const iv = payload.subarray(ivStart, tagStart);
  const tag = payload.subarray(tagStart, dataStart);
  const encrypted = payload.subarray(dataStart);

  const decipher = createDecipheriv('aes-256-gcm', documentKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
