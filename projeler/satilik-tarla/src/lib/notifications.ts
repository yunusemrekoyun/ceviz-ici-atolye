import { prisma } from './prisma';

/** Site içi zil bildirimi — e-postanın ikizi. Bildirim yazılamazsa akış
 * düşmez (e-postayla aynı ilke). */
export async function pushNotification(
  userId: string,
  data: { title: string; body?: string; href?: string },
) {
  try {
    await prisma.notification.create({
      data: { userId, title: data.title, body: data.body, href: data.href },
    });
  } catch (err) {
    console.warn('[bildirim] yazılamadı:', err);
  }
}
