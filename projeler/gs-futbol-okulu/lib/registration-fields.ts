/**
 * Kayıt formunun alanları ve boş değerleri: doğrulama kütüphanesi (zod) içermez, tarayıcı bileşenleri
 * buradan alır; doğrulama `lib/validation.ts`'te sunucuda yapılır.
 */
/** Formdaki tüm alanlar string olarak tutulur; şema bunları normalize edip tipli veriye çevirir. */
export type RegistrationFormValues = {
  studentTc: string;
  studentFullName: string;
  birthDate: string;
  homeAddress: string;
  studentPhone: string;
  bloodGroup: string;
  email: string;

  fatherFullName: string;
  fatherTc: string;
  fatherPhone: string;

  motherFullName: string;
  motherTc: string;
  motherPhone: string;

  contactParentType: string;
  contactParentFullName: string;
  contactParentPhone: string;

  emergencyFullName: string;
  emergencyRelation: string;
  emergencyPhone: string;
};

export type RegistrationField = keyof RegistrationFormValues;

export const REGISTRATION_FIELDS: RegistrationField[] = [
  "studentTc",
  "studentFullName",
  "birthDate",
  "homeAddress",
  "studentPhone",
  "bloodGroup",
  "email",
  "fatherFullName",
  "fatherTc",
  "fatherPhone",
  "motherFullName",
  "motherTc",
  "motherPhone",
  "contactParentType",
  "contactParentFullName",
  "contactParentPhone",
  "emergencyFullName",
  "emergencyRelation",
  "emergencyPhone",
];

export function emptyFormValues(): RegistrationFormValues {
  return {
    studentTc: "",
    studentFullName: "",
    birthDate: "",
    homeAddress: "",
    studentPhone: "",
    bloodGroup: "",
    email: "",
    fatherFullName: "",
    fatherTc: "",
    fatherPhone: "",
    motherFullName: "",
    motherTc: "",
    motherPhone: "",
    contactParentType: "",
    contactParentFullName: "",
    contactParentPhone: "",
    emergencyFullName: "",
    emergencyRelation: "",
    emergencyPhone: "",
  };
}

export type FieldErrors = Partial<Record<RegistrationField, string>>;
