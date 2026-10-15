// Shared room shape for the mobile screens — mirrors /api/public/rooms
// (same structure RoomsScreen uses).
export interface MediaItem {
  id: string;
  pathThumb: string | null;
  pathMedium: string | null;
  pathOriginal: string;
  mimeType: string;
}

export interface RoomData {
  id: string;
  roomTypeId: string;
  name: string;
  basePrice: number;
  description: string | null;
  available: boolean;
  maxAdults: number;
  maxChildren: number;
  roomType: { id: string; name: string; amenities: string[] };
  media: MediaItem[];
}

/** First non-video image of a room, as a /uploads URL, or null. */
export function roomImage(room: { media: MediaItem[] }): string | null {
  const img = room.media.find((m) => !m.mimeType.startsWith('video/'));
  if (!img) return null;
  return `/uploads/${img.pathMedium ?? img.pathOriginal}`;
}
