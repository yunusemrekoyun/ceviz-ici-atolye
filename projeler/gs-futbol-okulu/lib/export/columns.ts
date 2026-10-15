/**
 * Excel sütun tanımları. Client'taki "Excel'e aktar" penceresi de bu listeyi kullanır (exceljs bağımlılığı yok).
 */
export type ColumnKind = "text" | "date" | "datetime" | "money" | "percent";
/** computed: kayıttan değil hesaplanarak gelir (lib/export/extras.ts) · billing: yalnız aidat izni olana. */
export type ExportColumn = { key: string; header: string; width: number; kind?: ColumnKind; computed?: boolean; billing?: boolean };
export type ColumnGroup = { title: string; columns: ExportColumn[]; billing?: boolean };

export const COLUMN_GROUPS: ColumnGroup[] = [
  {
    title: "Öğrenci",
    columns: [
      { key: "studentNo", header: "Öğrenci No", width: 10 },
      { key: "studentTc", header: "Öğrenci T.C. Kimlik No", width: 22, kind: "text" },
      { key: "studentFullName", header: "Öğrenci Ad Soyad", width: 28 },
      { key: "birthDate", header: "Doğum Tarihi", width: 14, kind: "date" },
      { key: "age", header: "Yaş", width: 7 },
      { key: "homeAddress", header: "Ev Adresi", width: 45 },
      { key: "studentPhone", header: "Öğrenci İrtibat Telefonu", width: 22, kind: "text" },
      { key: "bloodGroup", header: "Kan Grubu", width: 12 },
      { key: "email", header: "E-mail", width: 30 },
    ],
  },
  {
    title: "Baba",
    columns: [
      { key: "fatherFullName", header: "Baba Ad Soyad", width: 26 },
      { key: "fatherTc", header: "Baba T.C. Kimlik No", width: 20, kind: "text" },
      { key: "fatherPhone", header: "Baba GSM", width: 16, kind: "text" },
    ],
  },
  {
    title: "Anne",
    columns: [
      { key: "motherFullName", header: "Anne Ad Soyad", width: 26 },
      { key: "motherTc", header: "Anne T.C. Kimlik No", width: 20, kind: "text" },
      { key: "motherPhone", header: "Anne GSM", width: 16, kind: "text" },
    ],
  },
  {
    title: "İletişim velisi",
    columns: [
      { key: "contactParentType", header: "İletişimde Olunacak Veli", width: 22 },
      { key: "contactParentFullName", header: "İletişim Velisi Ad Soyad", width: 26 },
      { key: "contactParentPhone", header: "İletişim Velisi Telefon", width: 22, kind: "text" },
    ],
  },
  {
    title: "Acil durum kişisi",
    columns: [
      { key: "emergencyFullName", header: "Acil Durum Kişisi Ad Soyad", width: 28 },
      { key: "emergencyRelation", header: "Yakınlık Durumu", width: 18 },
      { key: "emergencyPhone", header: "Acil Durum Telefon", width: 18, kind: "text" },
    ],
  },
  {
    title: "Süreç",
    columns: [
      { key: "status", header: "Durum", width: 18 },
      { key: "appointmentAt", header: "Randevu", width: 18, kind: "datetime" },
      { key: "group", header: "Grup", width: 14 },
      { key: "isGoalkeeper", header: "Kaleci", width: 8 },
      { key: "heightCm", header: "Boy (cm)", width: 10 },
      { key: "weightKg", header: "Kilo (kg)", width: 10 },
      { key: "enrolledAt", header: "Asıl Kayıt Tarihi", width: 16, kind: "date" },
      { key: "adminNote", header: "Yönetici Notu", width: 40 },
    ],
  },
  {
    title: "Grup ve program",
    columns: [
      { key: "groupYears", header: "Grup Doğum Yılları", width: 14, computed: true },
      { key: "groupAges", header: "Grup Yaş Aralığı", width: 12, computed: true },
      { key: "schedule", header: "Antrenman Günleri", width: 30, computed: true },
      { key: "venue", header: "Saha", width: 22, computed: true },
      { key: "coach", header: "Antrenör", width: 20, computed: true },
    ],
  },
  {
    title: "Aidat",
    billing: true,
    columns: [
      { key: "payStatus", header: "Aidat Durumu", width: 20, computed: true, billing: true },
      { key: "nextPayment", header: "Ödeme Günü", width: 13, kind: "date", computed: true, billing: true },
      { key: "amountDue", header: "Beklenen Aidat", width: 14, kind: "money", computed: true, billing: true },
      { key: "monthlyFee", header: "Aidat Tutarı (8 antrenman)", width: 16, kind: "money", computed: true, billing: true },
      { key: "discount", header: "İndirim", width: 20, computed: true, billing: true },
      { key: "lastPaymentOn", header: "Son Ödeme", width: 13, kind: "date", computed: true, billing: true },
      { key: "lastPaymentAmount", header: "Son Ödeme Tutarı", width: 14, kind: "money", computed: true, billing: true },
      { key: "lastPaymentMethod", header: "Son Ödeme Şekli", width: 14, computed: true, billing: true },
      { key: "paidTotal", header: "Alınan Aidat (seçilen aralık)", width: 14, kind: "money", computed: true, billing: true },
    ],
  },
  {
    title: "Forma ve malzeme",
    billing: true,
    columns: [
      { key: "kitShirt", header: "Forma Bedeni", width: 12, computed: true, billing: true },
      { key: "kitState", header: "Forma Durumu", width: 17, computed: true, billing: true },
      { key: "kitPaid", header: "Forma Parası", width: 12, computed: true, billing: true },
      { key: "kitSocks", header: "Tozluk Numarası", width: 13, computed: true, billing: true },
      { key: "kitSocksState", header: "Tozluk Durumu", width: 17, computed: true, billing: true },
      { key: "tracksuit", header: "Eşofman", width: 24, computed: true, billing: true },
      { key: "kit", header: "Forma / Malzeme (özet)", width: 40, computed: true, billing: true },
    ],
  },
  {
    title: "Devam (seçilen aralık)",
    columns: [
      { key: "attendanceRate", header: "Devam %", width: 9, kind: "percent", computed: true },
      { key: "attended", header: "Geldi", width: 8, computed: true },
      { key: "missed", header: "Gelmedi", width: 9, computed: true },
    ],
  },
  {
    title: "Tarihler",
    columns: [
      { key: "createdAt", header: "Başvuru Tarihi", width: 18, kind: "datetime" },
      { key: "updatedAt", header: "Son Güncelleme Tarihi", width: 20, kind: "datetime" },
    ],
  },
];

export const ALL_COLUMNS: ExportColumn[] = COLUMN_GROUPS.flatMap((g) => g.columns);
export const ALL_COLUMN_KEYS = ALL_COLUMNS.map((c) => c.key);

/** Forma sayfasındaki çıktının varsayılan sütunları: herkes, bedeni ve durumu. */
export const FORMA_LIST_COLUMNS = ["studentNo", "studentFullName", "group", "isGoalkeeper", "kitShirt", "kitState", "kitPaid", "kitSocks", "kitSocksState", "tracksuit"];

/** Hazır seçimler. */
export const COLUMN_PRESETS: { label: string; keys: string[]; billing?: boolean }[] = [
  { label: "Tümü", keys: ALL_COLUMN_KEYS },
  { label: "İletişim listesi", keys: ["studentFullName", "age", "group", "status", "contactParentType", "contactParentFullName", "contactParentPhone"] },
  { label: "Antrenör listesi", keys: ["studentFullName", "birthDate", "age", "group", "isGoalkeeper", "heightCm", "weightKg", "bloodGroup", "contactParentFullName", "contactParentPhone", "emergencyFullName", "emergencyPhone"] },
  { label: "Grup ve program", keys: ["studentNo", "studentFullName", "age", "group", "groupYears", "schedule", "venue", "coach", "isGoalkeeper", "contactParentFullName", "contactParentPhone"] },
  { label: "Aidat listesi", keys: ["studentNo", "studentFullName", "group", "contactParentFullName", "contactParentPhone", "payStatus", "nextPayment", "amountDue", "discount", "lastPaymentOn", "lastPaymentAmount"], billing: true },
  { label: "Forma listesi", keys: FORMA_LIST_COLUMNS, billing: true },
];

/** Aidat izni yoksa aidat / forma sütunları çıkarılır. */
export function allowedColumns(columns: ExportColumn[], billing: boolean): ExportColumn[] {
  return billing ? columns : columns.filter((c) => !c.billing);
}

/** Sorgudan gelen sütun listesini bilinen anahtarlarla sınırlar; boşsa tüm sütunlar. */
export function resolveColumns(keys: string[] | null | undefined): ExportColumn[] {
  if (!keys || keys.length === 0) return ALL_COLUMNS;
  const wanted = new Set(keys);
  const picked = ALL_COLUMNS.filter((c) => wanted.has(c.key));
  return picked.length > 0 ? picked : ALL_COLUMNS;
}
