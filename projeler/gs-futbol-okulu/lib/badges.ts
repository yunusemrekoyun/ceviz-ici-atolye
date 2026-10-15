// Devam rozetleri (veli panelinde çocuğa motivasyon). Kayıtlar en yeniden eskiye sıralı gelir.
export type Badge = { key: string; title: string; text: string; earned: boolean };

export function attendanceBadges(records: { status: string; date: string }[], today: string): Badge[] {
  const present = records.filter((r) => r.status === "present").length;
  let streak = 0;
  for (const r of records) {
    if (r.status === "present") streak++;
    else if (r.status === "absent") break;
  }
  const recent = records.filter(r => r.date <= today && r.status !== "excused").slice(0, 8);
  const perfectPack = recent.length === 8 && recent.every(r => r.status === "present");
  return [
    { key: "ilk", title: "İlk antrenman", text: "Sahaya ilk adım", earned: present >= 1 },
    { key: "10", title: "10 antrenman", text: "Düzenli sporcu", earned: present >= 10 },
    { key: "seri5", title: "5'li seri", text: "Üst üste 5 antrenman", earned: streak >= 5 },
    { key: "paket8", title: "8’de 8", text: "Son 8 antrenmanın tamamına katıldı", earned: perfectPack },
    { key: "25", title: "25 antrenman", text: "Takımın demirbaşı", earned: present >= 25 },
    { key: "50", title: "50 antrenman", text: "Gerçek bir Galatasaraylı", earned: present >= 50 },
  ];
}
