// Satıcı bilgileri ve yasal metin sürümü. Sözleşme sayfası, ödeme adımındaki ön
// bilgilendirme ve siparişe kaydedilen onay aynı sürümü kullanır. Metin
// değiştiğinde LEGAL_VERSION güncellenmelidir (onay kayıtları hangi metnin
// onaylandığını bu değerle gösterir).
export const LEGAL_VERSION = "2026-09-27";

export const STORE = {
  brand: "OLDSOCKS",
  companyTitle: "OLDSOCKS",
  address: "Alipaşa Mahallesi Üçbey Sokak No:7/A, Kütahya Merkez",
  email: "oldscks@gmail.com",
  phone: "+90 541 428 29 89",
};

export function legalVersionLabel() {
  const [y, m, d] = LEGAL_VERSION.split("-");
  return `${d}.${m}.${y}`;
}
