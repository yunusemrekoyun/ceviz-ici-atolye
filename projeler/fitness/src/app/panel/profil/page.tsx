import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "@/components/panel/ProfileClient";
import { IlerlemeClient } from "@/components/panel/IlerlemeClient";
import { PageTabs } from "@/components/ui/PageTabs";
import { formatDate } from "@/lib/utils";

const TABS = [
  { key: "hesabim",  label: "Hesabım" },
  { key: "ilerleme", label: "İlerleme" },
];

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "hesabim";

  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.sub },
    select: {
      id: true, name: true, email: true, phone: true, avatarUrl: true,
      emailVerified: true, createdAt: true,
      sessions: {
        where: { expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        select: { id: true, userAgent: true, ip: true, createdAt: true },
        take: 5,
      },
    },
  });

  const member = await prisma.member.findUnique({
    where: { userId: user.sub },
    select: {
      id: true,
      heightCm: true,
      startWeightKg: true,
      targetWeightKg: true,
      birthDate: true,
      gender: true,
      goal: true,
      healthNotes: true,
      referralCode: true,
      referrals: { select: { referralRewarded: true } },
    },
  });

  const [measurements, photos] =
    tab === "ilerleme" && member
      ? await Promise.all([
          prisma.measurement.findMany({
            where: { memberId: member.id },
            orderBy: { recordedAt: "asc" },
          }),
          prisma.progressPhoto.findMany({
            where: { memberId: member.id },
            orderBy: { takenAt: "desc" },
          }),
        ])
      : [[], []];

  const memberInfo = member ? {
    heightCm:       member.heightCm       ?? null,
    startWeightKg:  member.startWeightKg  ? Number(member.startWeightKg)  : null,
    targetWeightKg: member.targetWeightKg ? Number(member.targetWeightKg) : null,
    birthDate:      member.birthDate      ? member.birthDate.toISOString().slice(0, 10) : null,
    gender:         member.gender         ?? null,
    goal:           member.goal           ?? null,
    healthNotes:    member.healthNotes    ?? null,
  } : null;

  const referral = member?.referralCode ? {
    code: member.referralCode,
    totalReferred: member.referrals.length,
    rewarded: member.referrals.filter((r) => r.referralRewarded).length,
  } : null;

  if (!dbUser) return null;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-body">Hesabım</div>
        <h1 className="text-2xl font-bold mt-0.5">Profil</h1>
      </div>

      <PageTabs tabs={TABS} active={tab} baseHref="/panel/profil" />

      {/* ── Hesabım ── */}
      {tab === "hesabim" && (
        <ProfileClient
          user={{
            name: dbUser.name,
            email: dbUser.email,
            phone: dbUser.phone ?? "",
            emailVerified: dbUser.emailVerified ? formatDate(dbUser.emailVerified) : null,
            createdAt: formatDate(dbUser.createdAt),
            sessions: dbUser.sessions.map((s) => ({
              id: s.id,
              userAgent: s.userAgent ?? "Bilinmeyen cihaz",
              ip: s.ip ?? "—",
              createdAt: formatDate(s.createdAt),
            })),
          }}
          memberInfo={memberInfo}
          referral={referral}
        />
      )}

      {/* ── İlerleme ── */}
      {tab === "ilerleme" && (
        <IlerlemeClient
          initialMeasurements={measurements.map((m) => ({
            ...m,
            recordedAt: m.recordedAt.toISOString(),
          }))}
          initialPhotos={photos.map((p) => ({
            ...p,
            takenAt: p.takenAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
