import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth || auth.user.roleSlug !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const before = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        roleId: true,
        isActive: true,
        role: { select: { slug: true } },
      },
    });

    // Müşteri rolü bu panel üzerinden atanamaz
    if (body.roleId !== undefined) {
      const targetRole = await prisma.role.findUnique({ where: { id: body.roleId }, select: { slug: true } });
      if (targetRole?.slug === 'musteri') {
        return NextResponse.json({ ok: false, message: 'Müşteri rolü bu panel üzerinden atanamaz.' }, { status: 400 });
      }
    }

    if (auth.user.id === id && body.roleId !== undefined) {
      const currentRole = await prisma.user.findUnique({ where: { id }, select: { role: { select: { slug: true } } } });
      if (currentRole?.role.slug === 'admin') {
        const adminCount = await prisma.user.count({ where: { role: { slug: 'admin' }, isActive: true } });
        if (adminCount <= 1) {
          return NextResponse.json({ ok: false, message: 'Son admin hesabının rolü değiştirilemez.' }, { status: 400 });
        }
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(body.firstName !== undefined && { firstName: body.firstName || null }),
        ...(body.lastName  !== undefined && { lastName:  body.lastName  || null }),
        ...(body.phone     !== undefined && { phone:     body.phone     || null }),
        ...(body.roleId    !== undefined && { roleId:    body.roleId }),
        ...(body.isActive  !== undefined && { isActive:  Boolean(body.isActive) }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, name: true, slug: true } },
        _count: { select: { reservations: true } },
      },
    });

    await writeAuditLog({
      request,
      auth,
      action: 'user.update',
      entityType: 'user',
      entityId: user.id,
      summary: `Kullanıcı güncellendi: ${user.email}`,
      before: before ? {
        firstName: before.firstName,
        lastName: before.lastName,
        phone: before.phone,
        roleId: before.roleId,
        roleSlug: before.role.slug,
        isActive: before.isActive,
      } : undefined,
      after: {
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        roleId: user.role.id,
        roleSlug: user.role.slug,
        isActive: user.isActive,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Güncelleme başarısız.';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth || auth.user.roleSlug !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { id } = await params;

    if (auth.user.id === id) {
      return NextResponse.json({ ok: false, message: 'Kendi hesabınızı silemezsiniz.' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { email: true, isActive: true, role: { select: { slug: true } } },
    });
    if (target?.role.slug === 'admin') {
      const adminCount = await prisma.user.count({ where: { role: { slug: 'admin' }, isActive: true } });
      if (adminCount <= 1) {
        return NextResponse.json({ ok: false, message: 'Son admin hesabı silinemez.' }, { status: 400 });
      }
    }

    await prisma.user.delete({ where: { id } });
    await writeAuditLog({
      request,
      auth,
      action: 'user.delete',
      entityType: 'user',
      entityId: id,
      summary: `Kullanıcı silindi: ${target?.email ?? id}`,
      before: target ? { email: target.email, roleSlug: target.role.slug, isActive: target.isActive } : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Silme başarısız.';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
