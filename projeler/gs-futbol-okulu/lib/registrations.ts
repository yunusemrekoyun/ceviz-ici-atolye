import { and, count, desc, eq, lt, max, ne } from "drizzle-orm";
import { countNewCallbackRequests } from "@/lib/callbacks";
import { getDb } from "@/lib/db";
import { payments, registrations, type Registration } from "@/lib/db/schema";
import type { AdminRegistrationInput, RegistrationInput } from "@/lib/validation";
import { istanbulDayKey } from "@/lib/format";
import { changeGroupKeepingRights, dropFuturePeriods, invalidatePeriodCache } from "@/lib/billing";
import { revokeCard } from "@/lib/cards";
import { rightsStartDay } from "@/lib/training-rights";

export class DuplicateStudentError extends Error {
  constructor() {
    super("duplicate_student_tc");
    this.name = "DuplicateStudentError";
  }
}

export class RegistrationStateError extends Error {}

export class RegistrationNotFoundError extends Error {
  constructor() {
    super("registration_not_found");
    this.name = "RegistrationNotFoundError";
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE"
  );
}

export function listRegistrations(): Registration[] {
  return getDb()
    .select()
    .from(registrations)
    .orderBy(desc(registrations.createdAt), desc(registrations.id))
    .all();
}

export function countRegistrations(): number {
  const row = getDb().select({ value: count() }).from(registrations).get();
  return row?.value ?? 0;
}

export function getRegistration(id: number): Registration | null {
  return getDb().select().from(registrations).where(eq(registrations.id, id)).get() ?? null;
}

export function studentTcExists(studentTc: string, excludeId?: number): boolean {
  const where =
    excludeId === undefined
      ? eq(registrations.studentTc, studentTc)
      : and(eq(registrations.studentTc, studentTc), ne(registrations.id, excludeId));
  const row = getDb().select({ id: registrations.id }).from(registrations).where(where).get();
  return Boolean(row);
}

export function findByStudentTc(studentTc: string): Registration | null {
  return getDb().select().from(registrations).where(eq(registrations.studentTc, studentTc)).get() ?? null;
}

export function createRegistration(input: RegistrationInput): Registration {
  if (studentTcExists(input.studentTc)) throw new DuplicateStudentError();
  const ts = nowIso();
  try {
    return getDb()
      .insert(registrations)
      .values({ ...input, createdAt: ts, updatedAt: ts })
      .returning()
      .get();
  } catch (err) {
    // Yarış durumu: aynı anda iki istek gelirse UNIQUE index son sözü söyler.
    if (isUniqueViolation(err)) throw new DuplicateStudentError();
    throw err;
  }
}

export function updateRegistration(id: number, input: RegistrationInput): Registration {
  if (!getRegistration(id)) throw new RegistrationNotFoundError();
  if (studentTcExists(input.studentTc, id)) throw new DuplicateStudentError();
  try {
    const updated = getDb()
      .update(registrations)
      .set({ ...input, updatedAt: nowIso() })
      .where(eq(registrations.id, id))
      .returning()
      .get();
    if (!updated) throw new RegistrationNotFoundError();
    return updated;
  } catch (err) {
    if (isUniqueViolation(err)) throw new DuplicateStudentError();
    throw err;
  }
}

/** Panelden elle ekleme (eksik bilgiye izin verir). */
export function createRegistrationAdmin(input: AdminRegistrationInput): Registration {
  if (input.studentTc && studentTcExists(input.studentTc)) throw new DuplicateStudentError();
  const ts = nowIso();
  try {
    return getDb()
      .insert(registrations)
      .values({ ...input, createdAt: ts, updatedAt: ts })
      .returning()
      .get();
  } catch (err) {
    if (isUniqueViolation(err)) throw new DuplicateStudentError();
    throw err;
  }
}

/** Panelden düzenleme: tüm alanlar, eksik bırakılabilir. Süreç / aidat bilgilerine dokunmaz. */
const SENSITIVE_FIELDS = ["studentTc", "fatherTc", "motherTc", "homeAddress", "bloodGroup"] as const;
type SensitiveSource = Partial<Record<(typeof SENSITIVE_FIELDS)[number], unknown>> | null | undefined;

/**
 * Hassas bilgiyi (TC, adres, kan grubu) göremeyen kullanıcıya bu alanlar boş gönderilir; onun kaydettiği
 * düzenlemede boş gelen değerler kayıttakilerle korunur. Kaynaklar sırayla denenir, ilk dolu değer kalır.
 */
export function keepSensitiveFields<T extends object>(input: T, ...sources: SensitiveSource[]): T {
  const out = { ...input } as Record<string, unknown>;
  for (const key of SENSITIVE_FIELDS) {
    const found = sources.map((s) => s?.[key]).find((v) => v !== null && v !== undefined && v !== "");
    if (found !== undefined) out[key] = found;
  }
  return out as T;
}

export function updateRegistrationAdmin(id: number, input: AdminRegistrationInput): Registration {
  if (!getRegistration(id)) throw new RegistrationNotFoundError();
  if (input.studentTc && studentTcExists(input.studentTc, id)) throw new DuplicateStudentError();
  try {
    const updated = getDb()
      .update(registrations)
      .set({ ...input, updatedAt: nowIso() })
      .where(eq(registrations.id, id))
      .returning()
      .get();
    if (!updated) throw new RegistrationNotFoundError();
    return updated;
  } catch (err) {
    if (isUniqueViolation(err)) throw new DuplicateStudentError();
    throw err;
  }
}

/**
 * Kaydı siler. Geçerli (iptal edilmemiş) ödemesi olan kayıt silinemez; önce ödemeler iptal edilir.
 * İptal edilmiş ödemeler kayıtla birlikte silinir; dönemler, kart, yoklama, malzeme vb. zaten kayda bağlı silinir.
 */
export function deleteRegistration(id: number): boolean {
  const db = getDb();
  return db.transaction(() => {
    const own = db.select({ receiptNo: payments.receiptNo, voidedAt: payments.voidedAt }).from(payments).where(eq(payments.registrationId, id)).all();
    const active = own.filter((p) => !p.voidedAt);
    if (active.length)
      throw new RegistrationStateError(
        `Bu kaydın geçerli ${active.length === 1 ? "bir ödemesi" : `${active.length} ödemesi`} var (makbuz ${active.map((p) => p.receiptNo).join(", ")}). Silmek için önce aidat bölümünden ödemeyi iptal edin; öğrenci ayrıldıysa silmek yerine “Okuldan ayrıldı” kullanın.`,
      );
    if (own.length) db.delete(payments).where(eq(payments.registrationId, id)).run();
    const deleted = db.delete(registrations).where(eq(registrations.id, id)).returning({ id: registrations.id }).get();
    return Boolean(deleted);
  });
}

/* ---------------- Süreç: randevu → geldi (asıl kayıt) / gelmedi / vazgeçti ---------------- */

function setProcessFields(id: number, fields: Partial<typeof registrations.$inferInsert>): Registration {
  const updated = getDb()
    .update(registrations)
    .set({ ...fields, updatedAt: nowIso() })
    .where(eq(registrations.id, id))
    .returning()
    .get();
  if (!updated) throw new RegistrationNotFoundError();
  return updated;
}

export function scheduleAppointment(id: number, appointmentAtIso: string): Registration {
  return setProcessFields(id, { status: "scheduled", appointmentAt: appointmentAtIso });
}

export function markNoShow(id: number): Registration {
  const reg = getRegistration(id);
  if (!reg) throw new RegistrationNotFoundError();
  return setProcessFields(id, { status: "no_show", noShowCount: reg.noShowCount + 1 });
}

export type EnrollmentInput = { heightCm: number | null; weightKg: number | null; groupId: number | null; enrolledAtIso: string; /** Verilmezse eski değer kalır. */ isGoalkeeper?: boolean };

export const FIRST_STUDENT_NO = 1001;

/** Sıradaki öğrenci numarası. Numara bir kez verilir, kayıt iptal olsa da başkasına geçmez. */
export function nextStudentNo(): number {
  const row = getDb().select({ value: max(registrations.studentNo) }).from(registrations).get();
  return Math.max((row?.value ?? 0) + 1, FIRST_STUDENT_NO);
}

export function enrollRegistration(id: number, input: EnrollmentInput): Registration {
  invalidatePeriodCache();
  return getDb().transaction(() => {
    const current = getRegistration(id);
    if (!current) throw new RegistrationNotFoundError();
    const newlyEnrolled = current.status !== "enrolled";
    // Kayıtlı öğrencinin grubu değişiyorsa hak paketleri geriye dönük yeni gruba göre sayılmaz
    if (!newlyEnrolled && current.groupId !== input.groupId) changeGroupKeepingRights(id, input.groupId);
    const enrolledDay = istanbulDayKey(input.enrolledAtIso);
    return setProcessFields(id, {
      status: "enrolled",
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      groupId: input.groupId,
      ...(input.isGoalkeeper === undefined ? {} : { isGoalkeeper: input.isGoalkeeper }),
      enrolledAt: input.enrolledAtIso,
      studentNo: current.studentNo ?? nextStudentNo(),
      // Kesim günü varsayılan olarak asıl kayıt günüdür; sonradan aidat ekranından değiştirilebilir.
      // Hak kayıt gününden başlar; kayıt o günün antrenmanından sonra yapıldıysa ertesi günden.
      ...(newlyEnrolled ? { billingDay: Number(enrolledDay.slice(8, 10)), billingAnchor: rightsStartDay(input.groupId, enrolledDay), leftAt: null } : {}),
    });
  });
}

/** Kaleci / oyuncu (öğrenci dosyasından tek dokunuşla). */
export function setGoalkeeper(id: number, isGoalkeeper: boolean): Registration {
  if (!getRegistration(id)) throw new RegistrationNotFoundError();
  return setProcessFields(id, { isGoalkeeper });
}

export function getRegistrationByStudentNo(studentNo: number): Registration | null {
  return getDb().select().from(registrations).where(eq(registrations.studentNo, studentNo)).get() ?? null;
}

/** Okuldan ayrıldı: yeni dönem açılmaz, erişim kapanır; kayıt ve geçmiş saklanır. */
export function markLeft(id: number, now: Date = new Date()): Registration {
  const reg = getRegistration(id);
  if (!reg) throw new RegistrationNotFoundError();
  if (reg.status !== "enrolled") throw new RegistrationStateError("Yalnız kayıtlı öğrenci ayrıldı olarak işaretlenebilir.");
  return getDb().transaction(() => {
    dropFuturePeriods(id, istanbulDayKey(now));
    revokeCard(id, null, "Okuldan ayrıldı");
    return setProcessFields(id, { status: "left", leftAt: now.toISOString() });
  });
}

/** Ayrılan öğrenci geri döndü: aidat bugünden yeniden başlar, kesim günü bugün olur. */
export function rejoin(id: number, now: Date = new Date()): Registration {
  const reg = getRegistration(id);
  if (!reg) throw new RegistrationNotFoundError();
  if (reg.status !== "left") throw new RegistrationStateError("Yalnız ayrılmış öğrenci yeniden etkinleştirilebilir.");
  const today = istanbulDayKey(now);
  invalidatePeriodCache();
  return setProcessFields(id, { status: "enrolled", leftAt: null, billingDay: Number(today.slice(8, 10)), billingAnchor: rightsStartDay(reg.groupId, today, now) });
}

/**
 * Durumu elle değiştirir (yanlış işaretlemeyi düzeltmek için). Kayıtlı / ayrılmış öğrenci buradan geri alınamaz:
 * aidat ve kart bilgisi taşıdıkları için "Okuldan ayrıldı" akışı kullanılır.
 */
export function changeStatus(id: number, status: "pending" | "scheduled" | "no_show" | "cancelled"): Registration {
  const reg = getRegistration(id);
  if (!reg) throw new RegistrationNotFoundError();
  if (reg.status === "enrolled" || reg.status === "left") throw new RegistrationStateError("Kayıtlı öğrencinin durumu buradan değişmez; okuldan ayrıldıysa “Okuldan Ayrıldı”yı kullanın.");
  if (status === "scheduled" && !reg.appointmentAt) throw new RegistrationStateError("Önce randevu verin.");
  // Randevu verilmiş kayıt "randevu bekliyor"a çekilirse randevu da geri alınmış olur.
  return setProcessFields(id, reg.status === "scheduled" && status === "pending" ? { status, appointmentAt: null } : { status });
}

/** Vazgeçti olarak işaretler ya da süreci baştan başlatır (randevu bilgisi korunur, kayıt bilgisi silinmez). */
export function setRegistrationStatus(id: number, status: "cancelled" | "pending"): Registration {
  return setProcessFields(id, { status });
}

/** Geri al: önceki süreç durumuna döner (randevu ve kayıt bilgileri silinmediği için yalnızca durum ve sayaç yeterli). */
export function restoreProcess(id: number, status: "pending" | "scheduled" | "no_show" | "cancelled", noShowCount: number, appointmentAt?: string | null): Registration {
  return setProcessFields(id, { status, noShowCount, ...(appointmentAt !== undefined ? { appointmentAt } : {}) });
}

/** Verilen randevuyu geri alır: kayıt "Randevu bekliyor"a döner, randevu tarihi silinir. */
export function cancelAppointment(id: number): Registration {
  const reg = getRegistration(id);
  if (!reg) throw new RegistrationNotFoundError();
  if (reg.status !== "scheduled") throw new RegistrationStateError("Bu kaydın verilmiş bir randevusu yok.");
  return setProcessFields(id, { status: "pending", appointmentAt: null });
}

export function updateAdminNote(id: number, note: string | null): Registration {
  return setProcessFields(id, { adminNote: note });
}

/** Panel menüsündeki rozetler: randevu bekleyenler ve sonucu girilmemiş geçmiş randevular. */
export function getPanelCounts(now: Date = new Date()): { pending: number; overdue: number; callbacks: number; claims: number; locked: number } {
  const db = getDb();
  const pending = db.select({ value: count() }).from(registrations).where(eq(registrations.status, "pending")).get()?.value ?? 0;
  const overdue =
    db
      .select({ value: count() })
      .from(registrations)
      .where(and(eq(registrations.status, "scheduled"), lt(registrations.appointmentAt, now.toISOString())))
      .get()?.value ?? 0;
  return { pending, overdue, callbacks: countNewCallbackRequests(), claims: 0, locked: 0 };
}

/* ---------------- Eksik bilgili (hızlı) kayıt ---------------- */

export type QuickRegistrationInput = {
  studentFullName: string;
  parentFullName: string | null;
  phone: string | null;
  groupId: number | null;
  birthDate: string | null;
  adminNote: string | null;
  /** Veli anne ya da babaysa bilgisi o alanlara yazılır; yoksa "Diğer" iletişim kişisi. */
  parentType?: "anne" | "baba" | "diger";
};

/**
 * Telefonla / elle alınan başvurular için: yalnızca bilinen alanlarla kayıt açılır, kalanlar boş kalır
 * ve kayıt "eksik bilgi" olarak görünür. Veli anne/baba ise o alanlara, değilse "Diğer" iletişim kişisine yazılır.
 */
export function createQuickRegistration(input: QuickRegistrationInput, now: Date = new Date()): Registration {
  const ts = now.toISOString();
  const parentType = input.parentType ?? "diger";
  return getDb()
    .insert(registrations)
    .values({
      studentTc: null,
      studentFullName: input.studentFullName,
      birthDate: input.birthDate ?? "",
      homeAddress: "",
      studentPhone: input.phone ?? "",
      bloodGroup: "",
      contactParentType: parentType,
      contactParentFullName: parentType === "diger" ? input.parentFullName : null,
      contactParentPhone: parentType === "diger" ? input.phone : null,
      motherFullName: parentType === "anne" ? input.parentFullName : null,
      motherPhone: parentType === "anne" ? input.phone : null,
      fatherFullName: parentType === "baba" ? input.parentFullName : null,
      fatherPhone: parentType === "baba" ? input.phone : null,
      emergencyFullName: "",
      emergencyRelation: "",
      emergencyPhone: "",
      groupId: input.groupId,
      adminNote: input.adminNote,
      createdAt: ts,
      updatedAt: ts,
    })
    .returning()
    .get();
}

/** Eksik bilgili kaydın hızlı alanlarını günceller (tam bilgi girişi normal düzenleme formuyla yapılır). */
export function updateQuickRegistration(id: number, input: QuickRegistrationInput): Registration {
  const current = getRegistration(id);
  if (!current) throw new RegistrationNotFoundError();
  return setProcessFields(id, {
    studentFullName: input.studentFullName,
    birthDate: input.birthDate ?? current.birthDate,
    studentPhone: current.studentPhone || (input.phone ?? ""),
    contactParentFullName: current.contactParentType === "diger" ? input.parentFullName : current.contactParentFullName,
    contactParentPhone: current.contactParentType === "diger" ? input.phone : current.contactParentPhone,
    groupId: current.status === "enrolled" ? current.groupId : input.groupId,
    adminNote: input.adminNote,
  });
}
