import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, err, validate, withHandler } from "@/lib/api-handler";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/token";
import { sendStaffAccountSetupEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

const staffCreateSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalı"),
  email: z.string().email("Geçerli bir e-posta girin"),
  phone: z.string().optional().nullable(),
  role: z.enum(["ADMIN", "STAFF"]),
});

export const GET = withHandler(async () => {
  await requireAdmin();
  const staff = await prisma.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.STAFF] } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(staff);
});

export const POST = withHandler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const { data, error } = await validate(staffCreateSchema, req);
  if (error) return error;

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) return err("Bu e-posta zaten kayıtlı", 409);

  // Kullanıcı bu şifreyle asla giriş yapmaz — kurulum e-postasındaki
  // token ile kendi şifresini belirler (forgot-password akışının aynısı).
  const placeholderHash = await bcrypt.hash(crypto.randomUUID(), 10);
  const setupToken = generateToken();
  const setupExpiry = new Date(Date.now() + 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      passwordHash: placeholderHash,
      role: data.role as Role,
      emailVerified: new Date(),
      resetToken: setupToken,
      resetTokenExpiry: setupExpiry,
    },
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
  });

  const roleLabel = data.role === "ADMIN" ? "yönetici" : "personel";
  await sendStaffAccountSetupEmail(user.email, user.name, setupToken, roleLabel);

  await audit({ userId: admin.sub, ip: getClientIp(req), action: "staff.create", entity: "user", entityId: user.id, meta: { name: user.name, email: user.email, role: user.role } });

  return ok(user, 201);
});
