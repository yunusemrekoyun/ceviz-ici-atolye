import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Yaş grupları. Doğum yılı aralığıyla tanımlanır; panelden isim ve aralık düzenlenebilir.
 * Etkin grupların aralıkları çakışamaz, böylece her doğum yılı en fazla bir gruba düşer.
 */
export const ageGroups = sqliteTable("age_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  minBirthYear: integer("min_birth_year").notNull(),
  maxBirthYear: integer("max_birth_year").notNull(),
  /** Birleşen ya da silinen grup: listelerden kalkar, geçmiş antrenman ve yoklamaları kalır. */
  archivedAt: text("archived_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export type AgeGroup = typeof ageGroups.$inferSelect;

/**
 * Kayıt tablosu. Telefonlar DB'de daima normalize (05XXXXXXXXX) tutulur,
 * doğum tarihi ISO (YYYY-MM-DD), zaman damgaları ISO 8601 UTC string olarak saklanır.
 */
export const registrations = sqliteTable(
  "registrations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Öğrenci
    // Eksik bilgili (panelden hızlı eklenen) kayıtlarda boş olabilir; UNIQUE index birden fazla NULL'a izin verir.
    studentTc: text("student_tc"),
    studentFullName: text("student_full_name").notNull(),
    birthDate: text("birth_date").notNull(),
    homeAddress: text("home_address").notNull(),
    studentPhone: text("student_phone").notNull(),
    bloodGroup: text("blood_group").notNull(),
    email: text("email"),

    // Baba
    fatherFullName: text("father_full_name"),
    fatherTc: text("father_tc"),
    fatherPhone: text("father_phone"),

    // Anne
    motherFullName: text("mother_full_name"),
    motherTc: text("mother_tc"),
    motherPhone: text("mother_phone"),

    // İletişimde olunacak veli: "anne" | "baba" | "diger"
    contactParentType: text("contact_parent_type").notNull(),
    contactParentFullName: text("contact_parent_full_name"),
    contactParentPhone: text("contact_parent_phone"),

    // Acil durumda velisi dışında ulaşılacak kişi
    emergencyFullName: text("emergency_full_name").notNull(),
    emergencyRelation: text("emergency_relation").notNull(),
    emergencyPhone: text("emergency_phone").notNull(),

    // Süreç: pending (randevu bekliyor) → scheduled → enrolled | no_show | cancelled
    status: text("status").notNull().default("pending"),
    appointmentAt: text("appointment_at"),
    noShowCount: integer("no_show_count").notNull().default(0),
    enrolledAt: text("enrolled_at"),
    heightCm: integer("height_cm"),
    weightKg: real("weight_kg"),
    groupId: integer("group_id").references(() => ageGroups.id, { onDelete: "set null" }),
    /** Kaleci mi (okula kayıtta ya da sonradan personel belirler). */
    isGoalkeeper: integer("is_goalkeeper", { mode: "boolean" }).notNull().default(false),
    adminNote: text("admin_note"),
    // Asıl kayıtta verilen kısa, değişmez öğrenci numarası (veli girişi ve kart yedeği).
    studentNo: integer("student_no"),
    // Aidat: hesap kesim günü (1-31; ay kısaysa ayın son günü) ve dönemlerin başlayabileceği en erken gün.
    billingDay: integer("billing_day"),
    billingAnchor: text("billing_anchor"),
    leftAt: text("left_at"),
    // İndirim: adı (ör. "Kardeş indirimi") ve yüzdesi; aidat dönemleri bu orana göre hesaplanır.
    discountName: text("discount_name"),
    discountPercent: integer("discount_percent"),
    // "Bu kayıtla aynı kişi değil" denmiş kayıt kimlikleri (JSON dizi); olası tekrar uyarısı bunlar için çıkmaz.
    notDuplicateOf: text("not_duplicate_of"),
    photoFileId: integer("photo_file_id"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    uniqueIndex("registrations_student_tc_unique").on(table.studentTc),
    index("registrations_created_at_idx").on(table.createdAt),
    index("registrations_status_idx").on(table.status),
    index("registrations_appointment_at_idx").on(table.appointmentAt),
    uniqueIndex("registrations_student_no_unique").on(table.studentNo),
  ],
);

export type Registration = typeof registrations.$inferSelect;
export type NewRegistration = typeof registrations.$inferInsert;

/** Ana sayfadaki "Sizi Arayalım" formundan gelen geri arama talepleri. status: new | done */
export const callbackRequests = sqliteTable(
  "callback_requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    status: text("status").notNull().default("new"),
    note: text("note"),
    handledAt: text("handled_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [index("callback_requests_status_idx").on(table.status), index("callback_requests_created_at_idx").on(table.createdAt)],
);

export type CallbackRequest = typeof callbackRequests.$inferSelect;

/**
 * Tüm panel kullanıcıları: admin, antrenör (coach), veli (guardian).
 * Admin/antrenör kullanıcı adı veya e-postayla; veli ayrıca öğrenci numarasıyla girer (VEL-01).
 * password_hash boşsa hesap davet aşamasındadır, giriş yapamaz.
 */
export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    role: text("role").notNull(),
    username: text("username"),
    email: text("email"),
    phone: text("phone"),
    fullName: text("full_name"),
    passwordHash: text("password_hash"),
    // active | disabled | invited
    status: text("status").notNull().default("active"),
    lastLoginAt: text("last_login_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    uniqueIndex("users_username_unique").on(table.username),
    uniqueIndex("users_email_unique").on(table.email),
    index("users_role_idx").on(table.role),
  ],
);

export type User = typeof users.$inferSelect;

/** Oturumlar (tüm roller). `id` çerezdeki token'ın SHA-256 özetidir. */
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    ip: text("ip"),
    lastIp: text("last_ip"),
    userAgent: text("user_agent"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export type Session = typeof sessions.$inferSelect;

/** Giriş denemeleri (başarılı/başarısız, tüm roller). 90 günden eskiler silinir. */
export const loginEvents = sqliteTable(
  "login_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    identifier: text("identifier").notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    success: integer("success", { mode: "boolean" }).notNull(),
    reason: text("reason"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [index("login_events_created_at_idx").on(table.createdAt)],
);

export type LoginEvent = typeof loginEvents.$inferSelect;

/** Roller: adlandırılmış izin kümeleri. `portal` kullanıcının hangi panele girdiğini belirler. */
export const roles = sqliteTable("roles", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  portal: text("portal").notNull(),
  permissions: text("permissions").notNull().default("[]"),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export type Role = typeof roles.$inferSelect;

/** İşlem geçmişi: kim, ne zaman, hangi kayıtta ne yaptı. Silinmez. */
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    userName: text("user_name"),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    summary: text("summary").notNull(),
    data: text("data"),
    ip: text("ip"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [index("audit_log_created_at_idx").on(table.createdAt), index("audit_log_entity_idx").on(table.entity, table.entityId)],
);

export type AuditEntry = typeof auditLog.$inferSelect;

/** Sistem ayarları: anahtar → JSON değer (aidat tutarı, tolerans günü, iletişim bilgileri…). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedBy: integer("updated_by"),
});

/** Gönderilen e-postaların kaydı (içerik tutulmaz, yalnız konu ve sonuç). */
export const mailLog = sqliteTable(
  "mail_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    template: text("template"),
    status: text("status").notNull(), // sent | failed | skipped
    error: text("error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [index("mail_log_created_at_idx").on(table.createdAt)],
);

/** Yüklenen dosyalar (öğrenci fotoğrafı, dekont). Dosya diskte, rastgele adla; yetki kontrolüyle servis edilir. */
export const files = sqliteTable(
  "files",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind").notNull(), // photo | receipt
    storageKey: text("storage_key").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    width: integer("width"),
    height: integer("height"),
    sha256: text("sha256").notNull(),
    registrationId: integer("registration_id").references(() => registrations.id, { onDelete: "set null" }),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [uniqueIndex("files_storage_key_unique").on(table.storageKey), index("files_registration_idx").on(table.registrationId)],
);

export type StoredFile = typeof files.$inferSelect;

/**
 * Onay ve bilgi metinleri. consent_type: required (onaylanmadan panel kullanılamaz) | optional (kabul/ret seçilir,
 * ör. fotoğraf izni) | info (yalnız gösterilir).
 */
export const legalTexts = sqliteTable("legal_texts", {
  key: text("key").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  consentType: text("consent_type").notNull().default("info"),
  sort: integer("sort").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export type LegalText = typeof legalTexts.$inferSelect;

/** Metin sürümleri. Yayınlanan sürüm değişmez; düzeltme yeni sürüm demektir. */
export const legalTextVersions = sqliteTable(
  "legal_text_versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    textKey: text("text_key")
      .notNull()
      .references(() => legalTexts.key, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().default("draft"), // draft | published
    createdBy: integer("created_by"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    publishedAt: text("published_at"),
  },
  (table) => [uniqueIndex("legal_text_versions_key_version_unique").on(table.textKey, table.version)],
);

export type LegalTextVersion = typeof legalTextVersions.$inferSelect;

/** Onay kaydı: kim, hangi metnin hangi sürümüne, ne zaman, kabul mü ret mi. */
export const consents = sqliteTable(
  "consents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    registrationId: integer("registration_id").references(() => registrations.id, { onDelete: "cascade" }),
    textKey: text("text_key").notNull(),
    versionId: integer("version_id")
      .notNull()
      .references(() => legalTextVersions.id),
    accepted: integer("accepted", { mode: "boolean" }).notNull(),
    // panel: veli kendisi · admin_attest: yazılı onayı admin beyan etti
    method: text("method").notNull().default("panel"),
    note: text("note"),
    ip: text("ip"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [index("consents_user_idx").on(table.userId), index("consents_registration_idx").on(table.registrationId)],
);

export type Consent = typeof consents.$inferSelect;

/** Aidat dönemi: kesim gününden bir sonraki kesim gününe. Tarihler İstanbul takvim günü (YYYY-MM-DD). */
export const feePeriods = sqliteTable(
  "fee_periods",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    dueDate: text("due_date").notNull(),
    amountKurus: integer("amount_kurus").notNull(),
    status: text("status").notNull().default("open"), // open | paid | void
    paymentId: integer("payment_id"),
    note: text("note"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [uniqueIndex("fee_periods_reg_start_unique").on(table.registrationId, table.startDate), index("fee_periods_status_idx").on(table.status)],
);

export type FeePeriod = typeof feePeriods.$inferSelect;

/** Tahsilat. Kayıt silinemez; hatalı ödeme iptal edilir (voided) ve dönemleri yeniden açılır. */
export const payments = sqliteTable(
  "payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => registrations.id),
    receiptNo: text("receipt_no").notNull(),
    amountKurus: integer("amount_kurus").notNull(),
    method: text("method").notNull(), // cash | eft
    paidOn: text("paid_on").notNull(),
    periodCount: integer("period_count").notNull(),
    note: text("note"),
    fileId: integer("file_id").references(() => files.id, { onDelete: "set null" }),
    claimId: integer("claim_id"),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    voidedAt: text("voided_at"),
    voidedBy: integer("voided_by"),
    voidReason: text("void_reason"),
  },
  (table) => [uniqueIndex("payments_receipt_no_unique").on(table.receiptNo), index("payments_registration_idx").on(table.registrationId), index("payments_paid_on_idx").on(table.paidOn)],
);

export type Payment = typeof payments.$inferSelect;

/** Veli "Ödeme yaptım" bildirimi. Onaylanana kadar erişim açılmaz. */
export const paymentClaims = sqliteTable(
  "payment_claims",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    method: text("method").notNull(), // cash | eft
    fileId: integer("file_id").references(() => files.id, { onDelete: "set null" }),
    note: text("note"),
    status: text("status").notNull().default("pending"), // pending | approved | rejected
    decidedBy: integer("decided_by"),
    decidedAt: text("decided_at"),
    rejectReason: text("reject_reason"),
    paymentId: integer("payment_id"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [index("payment_claims_status_idx").on(table.status), index("payment_claims_registration_idx").on(table.registrationId)],
);

export type PaymentClaim = typeof paymentClaims.$inferSelect;

/** Ödeme sözü: veli "şu gün ödeyeceğim" dediyse o güne kadar hak sürer (yalnız admin girer; ödeme gelince kapanır). */
export const accessOverrides = sqliteTable(
  "access_overrides",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    startsOn: text("starts_on").notNull(),
    endsOn: text("ends_on").notNull(),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    revokedAt: text("revoked_at"),
    revokedBy: integer("revoked_by"),
    /** Ödeme sözü: öğrencinin ödemesi gelince kapanır (söz tutuldu). */
    fulfilledAt: text("fulfilled_at"),
  },
  (table) => [index("access_overrides_registration_idx").on(table.registrationId)],
);

export type AccessOverride = typeof accessOverrides.$inferSelect;

/**
 * Panel içi bildirim. userId doluysa o kişiye; permission doluysa o izne sahip herkese (ör. aidat.al).
 * Okundu bilgisi kişi başına notification_reads'te.
 */
export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    permission: text("permission"),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    dedupeKey: text("dedupe_key"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_created_idx").on(table.createdAt),
    uniqueIndex("notifications_dedupe_unique").on(table.dedupeKey),
  ],
);

export type Notification = typeof notifications.$inferSelect;

export const notificationReads = sqliteTable(
  "notification_reads",
  {
    notificationId: integer("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: text("read_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.notificationId, table.userId] })],
);

/** Günlük işlerin çalışma kaydı; aynı gün ikinci tetikleme işi tekrarlamaz. */
export const jobRuns = sqliteTable(
  "job_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    job: text("job").notNull(),
    runKey: text("run_key").notNull(),
    status: text("status").notNull(), // running | ok | failed
    detail: text("detail"),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
  },
  (table) => [uniqueIndex("job_runs_job_key_unique").on(table.job, table.runKey)],
);

/* ---------------- Antrenman programı ---------------- */

export const venues = sqliteTable("venues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  address: text("address"),
  lat: real("lat"),
  lng: real("lng"),
  note: text("note"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export type Venue = typeof venues.$inferSelect;

/** Grubun haftalık tekrar eden antrenmanı. weekday: 1 = Pazartesi … 7 = Pazar. */
export const groupSchedules = sqliteTable(
  "group_schedules",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    groupId: integer("group_id")
      .notNull()
      .references(() => ageGroups.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    venueId: integer("venue_id").references(() => venues.id, { onDelete: "set null" }),
    validFrom: text("valid_from"),
    validTo: text("valid_to"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [index("group_schedules_group_idx").on(table.groupId)],
);

export type GroupSchedule = typeof groupSchedules.$inferSelect;

/**
 * Tarihli antrenman seansı. Programdan üretilir (schedule_id + original_date benzersiz);
 * taşınırsa date/saat değişir, original_date kalır. Tek seferlik seansın schedule_id'si boştur.
 */
export const trainingSessions = sqliteTable(
  "training_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    groupId: integer("group_id")
      .notNull()
      .references(() => ageGroups.id, { onDelete: "cascade" }),
    scheduleId: integer("schedule_id").references(() => groupSchedules.id, { onDelete: "set null" }),
    originalDate: text("original_date"),
    date: text("date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    venueId: integer("venue_id").references(() => venues.id, { onDelete: "set null" }),
    status: text("status").notNull().default("scheduled"), // scheduled | cancelled
    cancelReason: text("cancel_reason"),
    moved: integer("moved", { mode: "boolean" }).notNull().default(false),
    // Antrenman günlüğü (antrenör doldurur)
    logText: text("log_text"),
    logBy: integer("log_by"),
    logAt: text("log_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    uniqueIndex("training_sessions_schedule_date_unique").on(table.scheduleId, table.originalDate),
    index("training_sessions_date_idx").on(table.date),
    index("training_sessions_group_idx").on(table.groupId),
  ],
);

export type TrainingSession = typeof trainingSessions.$inferSelect;

/** Antrenör ↔ grup (çoka çok). */
export const groupCoaches = sqliteTable(
  "group_coaches",
  {
    groupId: integer("group_id")
      .notNull()
      .references(() => ageGroups.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.userId] }), index("group_coaches_user_idx").on(table.userId)],
);

/* ---------------- Yoklama ---------------- */

export const attendance = sqliteTable(
  "attendance",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // present | absent | excused
    source: text("source").notNull().default("manual"), // qr | manual
    markedBy: integer("marked_by").references(() => users.id, { onDelete: "set null" }),
    markedAt: text("marked_at").notNull(),
  },
  (table) => [uniqueIndex("attendance_session_reg_unique").on(table.sessionId, table.registrationId), index("attendance_registration_idx").on(table.registrationId)],
);

export type Attendance = typeof attendance.$inferSelect;

/* ---------------- Öğrenci kartı ---------------- */

export const studentCards = sqliteTable(
  "student_cards",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    status: text("status").notNull().default("active"), // active | revoked
    revokedAt: text("revoked_at"),
    revokedBy: integer("revoked_by"),
    revokeReason: text("revoke_reason"),
    printedAt: text("printed_at"),
    createdBy: integer("created_by"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [uniqueIndex("student_cards_code_unique").on(table.code), index("student_cards_registration_idx").on(table.registrationId)],
);

export type StudentCard = typeof studentCards.$inferSelect;

/** Her kart okutma / numara girişi: sonuç ve okutan (kilitli öğrenci denemeleri buradan izlenir). */
export const scanEvents = sqliteTable(
  "scan_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    input: text("input").notNull(),
    registrationId: integer("registration_id").references(() => registrations.id, { onDelete: "set null" }),
    cardId: integer("card_id"),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    sessionId: integer("session_id"),
    result: text("result").notNull(), // marked | already | no_session | locked | revoked | inactive | unknown | not_allowed | viewed
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [index("scan_events_created_idx").on(table.createdAt), index("scan_events_registration_idx").on(table.registrationId)],
);

/* ---------------- Duyurular ---------------- */

export const announcements = sqliteTable(
  "announcements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    // Boşsa tüm veliler; doluysa JSON grup kimlikleri.
    groupIds: text("group_ids"),
    kind: text("kind").notNull().default("general"), // general | cancel
    sessionId: integer("session_id"),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [index("announcements_created_idx").on(table.createdAt)],
);

export type Announcement = typeof announcements.$inferSelect;

/* ---------------- Veli hesapları ---------------- */

/** Veli hesabı ↔ öğrenci (kardeşler tek hesapta). */
export const guardianStudents = sqliteTable(
  "guardian_students",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    relation: text("relation"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [primaryKey({ columns: [table.userId, table.registrationId] }), index("guardian_students_registration_idx").on(table.registrationId)],
);

/** Tek kullanımlık bağlantılar: veli daveti (şifre belirleme) ve şifre sıfırlama. Yalnız özet saklanır. */
export const authTokens = sqliteTable(
  "auth_tokens",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull(), // invite | reset
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    createdBy: integer("created_by"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [uniqueIndex("auth_tokens_hash_unique").on(table.tokenHash), index("auth_tokens_user_idx").on(table.userId)],
);

/* ---------------- Gelişim ---------------- */

/** Boy / kilo ölçümleri (tarihli seri). Asıl kayıttaki ölçüm ilk satır olarak taşınır. */
export const measurements = sqliteTable(
  "measurements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    measuredOn: text("measured_on").notNull(),
    heightCm: real("height_cm"),
    weightKg: real("weight_kg"),
    createdBy: integer("created_by"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [uniqueIndex("measurements_reg_day_unique").on(table.registrationId, table.measuredOn)],
);

export type Measurement = typeof measurements.$inferSelect;

/** Fiziksel test tanımı (parametreler toplantıda belirlenecek; kod yazmadan eklenir). */
export const testDefinitions = sqliteTable("test_definitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  higherBetter: integer("higher_better", { mode: "boolean" }).notNull().default(true),
  decimals: integer("decimals").notNull().default(1),
  groupIds: text("group_ids"),
  description: text("description"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sort: integer("sort").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export type TestDefinition = typeof testDefinitions.$inferSelect;

export const testResults = sqliteTable(
  "test_results",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    testId: integer("test_id")
      .notNull()
      .references(() => testDefinitions.id, { onDelete: "cascade" }),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    testedOn: text("tested_on").notNull(),
    value: real("value").notNull(),
    createdBy: integer("created_by"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [uniqueIndex("test_results_unique").on(table.testId, table.registrationId, table.testedOn), index("test_results_registration_idx").on(table.registrationId)],
);

export type TestResult = typeof testResults.$inferSelect;

/** Antrenör değerlendirmesi: kriter başına 1–5 puan + yorum. */
export const evaluations = sqliteTable(
  "evaluations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    evaluatedOn: text("evaluated_on").notNull(),
    scores: text("scores").notNull(),
    comment: text("comment"),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [index("evaluations_registration_idx").on(table.registrationId)],
);

export type Evaluation = typeof evaluations.$inferSelect;

/* ---------------- Antrenman takibi ---------------- */

export const drills = sqliteTable("drills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(), // teknik | taktik | kondisyon | oyun
  description: text("description"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export type Drill = typeof drills.$inferSelect;

export const sessionDrills = sqliteTable(
  "session_drills",
  {
    sessionId: integer("session_id")
      .notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    drillId: integer("drill_id")
      .notNull()
      .references(() => drills.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.sessionId, table.drillId] })],
);

/* ---------------- Forma / malzeme ---------------- */

export const equipmentItems = sqliteTable("equipment_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  priceKurus: integer("price_kurus").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sort: integer("sort").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export type EquipmentItem = typeof equipmentItems.$inferSelect;

/**
 * Öğrenciye verilen / satılan malzeme. Ödeme ve teslim ayrı izlenir.
 * delivery: delivered (teslim edildi) | to_order (sipariş verilecek) | ordered (sipariş verildi) | waiting (teslim edilmedi)
 * Forma takımında `size` forma-şort bedenidir ("9-10", "M"); tozluğun numarası ve teslimi ayrı sütunlarda.
 */
export const equipmentOrders = sqliteTable(
  "equipment_orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => equipmentItems.id),
    size: text("size"),
    /** Tozluk numarası ("34-36"); yalnız tozluklu üründe. */
    sockSize: text("sock_size"),
    /** Tozluğun teslimi (delivery ile aynı değerler); üründe tozluk yoksa boş. */
    sockDelivery: text("sock_delivery"),
    sockDeliveredOn: text("sock_delivered_on"),
    priceKurus: integer("price_kurus").notNull(),
    paid: integer("paid", { mode: "boolean" }).notNull().default(false),
    paidOn: text("paid_on"),
    // cash | eft (parası alındıysa); kasa defterinde nakit / havale ayrımı için
    paidMethod: text("paid_method"),
    /** Parayı alan kullanıcı. */
    paidBy: integer("paid_by"),
    /**
     * Öğrencinin kendisinde zaten vardı (eski sezon, kardeşten): satış değil. 0 ₺, "ödendi" ve "teslim edildi" olarak
     * saklanır ki parası alınmadı / sipariş listelerine ve kasaya düşmesin; forması eksik de sayılmaz.
     */
    owned: integer("owned", { mode: "boolean" }).notNull().default(false),
    delivery: text("delivery").notNull().default("waiting"),
    deliveredOn: text("delivered_on"),
    note: text("note"),
    createdBy: integer("created_by"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [index("equipment_orders_registration_idx").on(table.registrationId), index("equipment_orders_item_idx").on(table.itemId)],
);

export type EquipmentOrder = typeof equipmentOrders.$inferSelect;

/**
 * Var olan bir öğrenci için (aynı T.C.) yeniden gönderilen ön kayıt formu. Doğrudan üzerine yazılmaz;
 * yönetici karşılaştırıp uygular ya da yok sayar.
 */
export const registrationSubmissions = sqliteTable(
  "registration_submissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    payload: text("payload").notNull(),
    status: text("status").notNull().default("pending"), // pending | applied | dismissed
    decidedBy: integer("decided_by"),
    decidedAt: text("decided_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [index("registration_submissions_reg_idx").on(table.registrationId)],
);

export type RegistrationSubmission = typeof registrationSubmissions.$inferSelect;

/** Ana sayfadaki herkese açık tanıtımlar; panel giriş hesaplarından bağımsızdır. */
export const coachProfiles = sqliteTable("coach_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  bio: text("bio").notNull(),
  photoKey: text("photo_key"),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export type CoachProfile = typeof coachProfiles.$inferSelect;
