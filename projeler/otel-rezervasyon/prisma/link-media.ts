/**
 * Scans public/uploads/originals/, reads existing room types & rooms from DB,
 * then inserts media records distributing files across all entities.
 * Run with: npx tsx prisma/link-media.ts
 */
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
const originalsDir = path.join(uploadsRoot, 'originals');

const MIME_MAP: Record<string, string> = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.mov':  'video/quicktime',
};

async function fileExists(p: string) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function main() {
  // 1. Read originals
  const files = await fs.readdir(originalsDir);
  const mediaFiles = [];

  for (const filename of files) {
    const ext = path.extname(filename).toLowerCase();
    const hash = path.basename(filename, path.extname(filename));
    const mime = MIME_MAP[ext];
    if (!mime) continue;

    const isImage = mime.startsWith('image/');
    const stat = await fs.stat(path.join(originalsDir, filename));

    // Check which processed variants exist
    const thumbPath  = `thumb/${hash}.webp`;
    const mediumPath = `medium/${hash}.webp`;
    const largePath  = `large/${hash}.webp`;

    mediaFiles.push({
      originalName: filename,
      mimeType: mime,
      size: stat.size,
      pathOriginal: `originals/${filename}`,
      pathThumb:  isImage && await fileExists(path.join(uploadsRoot, thumbPath))  ? thumbPath  : null,
      pathMedium: isImage && await fileExists(path.join(uploadsRoot, mediumPath)) ? mediumPath : null,
      pathLarge:  isImage && await fileExists(path.join(uploadsRoot, largePath))  ? largePath  : null,
      isProcessed: isImage,
    });
  }

  console.log(`Found ${mediaFiles.length} files in originals/`);
  if (mediaFiles.length === 0) {
    console.log('Nothing to link.');
    return;
  }

  // 2. Fetch entities
  const roomTypes = await prisma.roomType.findMany({ orderBy: { sortOrder: 'asc' } });
  const rooms     = await prisma.room.findMany({ orderBy: { sortOrder: 'asc' } });

  console.log(`Room types: ${roomTypes.length}, Rooms: ${rooms.length}`);

  // 3. Clear existing media records (re-link fresh)
  await prisma.media.deleteMany({
    where: { entityType: { in: ['room_type', 'room'] } },
  });

  // 4. Separate images and videos
  const images = mediaFiles.filter(f => f.mimeType.startsWith('image/'));
  const videos = mediaFiles.filter(f => f.mimeType.startsWith('video/'));

  // 5. Distribute: room types get images (round-robin), rooms get remaining images + videos
  const records: {
    originalName: string; mimeType: string; size: number;
    pathOriginal: string; pathThumb: string | null; pathMedium: string | null; pathLarge: string | null;
    isProcessed: boolean; entityType: string; entityId: string; sortOrder: number;
  }[] = [];

  // Give each room type at least 1 image, cycling through available images
  roomTypes.forEach((rt, i) => {
    const img = images[i % images.length];
    records.push({ ...img, entityType: 'room_type', entityId: rt.id, sortOrder: 0 });
  });

  // Give remaining images to rooms (round-robin)
  rooms.forEach((room, i) => {
    const img = images[i % images.length];
    records.push({ ...img, entityType: 'room', entityId: room.id, sortOrder: 0 });
  });

  // Add videos to first room type and first room
  videos.forEach((vid, i) => {
    if (roomTypes[i]) {
      records.push({ ...vid, entityType: 'room_type', entityId: roomTypes[i].id, sortOrder: 1 });
    }
    if (rooms[i]) {
      records.push({ ...vid, entityType: 'room', entityId: rooms[i].id, sortOrder: 1 });
    }
  });

  // 6. Insert
  await prisma.media.createMany({ data: records });

  console.log(`\nInserted ${records.length} media records:`);
  console.log(`  - ${roomTypes.length} room type images + ${Math.min(videos.length, roomTypes.length)} videos`);
  console.log(`  - ${rooms.length} room images + ${Math.min(videos.length, rooms.length)} videos`);
  console.log('\nDone. Refresh the site to see images.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
