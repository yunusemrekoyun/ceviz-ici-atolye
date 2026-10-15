import type { Registration } from "@/lib/db/schema";
import { formatPhone } from "@/lib/phone";
import type { RegistrationFormValues } from "@/lib/registration-fields";

/**
 * DB kaydını düzenleme formunun beklediği string alanlara çevirir.
 * Client bileşenlerinden de import edilebilir (DB bağımlılığı yoktur).
 */
export function registrationToFormValues(reg: Registration): RegistrationFormValues {
  return {
    studentTc: reg.studentTc ?? "",
    studentFullName: reg.studentFullName,
    birthDate: reg.birthDate,
    homeAddress: reg.homeAddress,
    studentPhone: formatPhone(reg.studentPhone),
    bloodGroup: reg.bloodGroup,
    email: reg.email ?? "",
    fatherFullName: reg.fatherFullName ?? "",
    fatherTc: reg.fatherTc ?? "",
    fatherPhone: formatPhone(reg.fatherPhone),
    motherFullName: reg.motherFullName ?? "",
    motherTc: reg.motherTc ?? "",
    motherPhone: formatPhone(reg.motherPhone),
    contactParentType: reg.contactParentType,
    contactParentFullName: reg.contactParentFullName ?? "",
    contactParentPhone: formatPhone(reg.contactParentPhone),
    emergencyFullName: reg.emergencyFullName,
    emergencyRelation: reg.emergencyRelation,
    emergencyPhone: formatPhone(reg.emergencyPhone),
  };
}
