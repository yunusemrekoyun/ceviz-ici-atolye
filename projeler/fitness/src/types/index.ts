// Shared frontend types — Prisma modellerinden türetilmiş, client'ta kullanılır.
// DB import'u yapılmaz; bu dosya hem server hem client component'lerde çalışır.

export type Role = "ADMIN" | "STAFF" | "TRAINER" | "MEMBER";
export type MemberStatus = "ACTIVE" | "EXPIRED" | "FROZEN" | "SUSPENDED" | "PENDING";
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "IYZICO" | "PAYTR";
export type PlanInterval = "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";
export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

// ---- Plan ----
export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: PlanInterval;
  durationDays: number;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  order: number;
  createdAt: string;
}

// ---- User ----
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
}

// ---- Member ----
export interface Member {
  id: string;
  memberNo: string;
  status: MemberStatus;
  gender: Gender | null;
  birthDate: string | null;
  heightCm: number | null;
  startWeightKg: number | null;
  goal: string | null;
  healthNotes: string | null;
  qrCode: string;
  branchId: string | null;
  trainerId: string | null;
  createdAt: string;
  user: Pick<User, "name" | "email" | "phone" | "avatarUrl">;
  memberships: MembershipSummary[];
}

export interface MembershipSummary {
  id: string;
  planId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  plan: Pick<Plan, "name" | "price" | "interval">;
}

// ---- Payment ----
export interface Payment {
  id: string;
  memberId: string;
  membershipId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  invoiceNo: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  member?: Pick<Member, "id" | "memberNo" | "user">;
}

// ---- Attendance ----
export interface Attendance {
  id: string;
  memberId: string;
  checkIn: string;
  checkOut: string | null;
  source: string;
  branchId: string | null;
  member?: Pick<Member, "id" | "memberNo" | "user">;
}

// ---- Measurement ----
export interface Measurement {
  id: string;
  memberId: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  musclePct: number | null;
  waistCm: number | null;
  chestCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  legCm: number | null;
  notes: string | null;
  recordedAt: string;
}

// ---- Trainer ----
export interface Trainer {
  id: string;
  userId: string;
  bio: string | null;
  specialty: string | null;
  experience: number;
  rating: number;
  isActive: boolean;
  user: Pick<User, "name" | "email" | "phone" | "avatarUrl">;
}

// ---- Branch ----
export interface Branch {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
  createdAt: string;
}

// ---- Appointment ----
export interface Appointment {
  id: string;
  memberId: string;
  trainerId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  member?: Pick<Member, "id" | "memberNo" | "user">;
  trainer?: Pick<Trainer, "id" | "user">;
}

// ---- Notification ----
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "info" | "success" | "warn" | "danger";
  readAt: string | null;
  createdAt: string;
}

// ---- Stats (dashboard) ----
export interface DashboardStats {
  totals: {
    members: number;
    active: number;
    expiring: number;
    todayCheckIns: number;
    monthRevenue: number;
    newThisMonth: number;
  };
  monthly: { month: string; revenue: number }[];
}

// ---- API Response wrappers ----
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
