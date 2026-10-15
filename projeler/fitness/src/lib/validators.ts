import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta giriniz."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır."),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Adınızı girin."),
  email: z.string().email("Geçerli bir e-posta giriniz."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır."),
  phone: z.string().optional(),
  referralCode: z.string().optional(),
});

export const memberCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  planId: z.string().optional(),
  heightCm: z.number().optional(),
  startWeightKg: z.number().optional(),
  goal: z.string().optional(),
});

export const trainerCreateSchema = z.object({
  name:        z.string().min(2, "Ad en az 2 karakter."),
  email:       z.string().email("Geçerli e-posta girin."),
  specialty:   z.string().optional(),
  bio:         z.string().optional(),
  experience:  z.number().int().min(0).default(0),
  rating:      z.number().min(0).max(5).default(0),
  avatarUrl:   z.string().url().optional().or(z.literal("")),
});

export const trainerUpdateSchema = z.object({
  name:        z.string().min(2).optional(),
  specialty:   z.string().optional(),
  bio:         z.string().optional(),
  experience:  z.number().int().min(0).optional(),
  rating:      z.number().min(0).max(5).optional(),
  avatarUrl:   z.string().optional(),
  isActive:    z.boolean().optional(),
});

export const availabilitySchema = z.array(
  z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Geçerli saat formatı: 09:00"),
    endTime:   z.string().regex(/^\d{2}:\d{2}$/, "Geçerli saat formatı: 17:00"),
  })
);

export const branchSchema = z.object({
  name:     z.string().min(2, "Şube adı en az 2 karakter olmalıdır."),
  city:     z.string().optional(),
  address:  z.string().optional(),
  phone:    z.string().optional(),
  lat:      z.number().optional(),
  lng:      z.number().optional(),
  isActive: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type MemberCreateInput = z.infer<typeof memberCreateSchema>;
export type BranchInput = z.infer<typeof branchSchema>;
