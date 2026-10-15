import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfilClient } from "./ProfilClient";

export const metadata = { title: "Profilim" };

export default async function EgitmenProfilPage() {
  const user = await requireTrainer();
  const trainer = await prisma.trainer.findUnique({
    where: { userId: user.sub },
    include: { user: { select: { name: true, phone: true, avatarUrl: true } } },
  });
  if (!trainer) return <div className="p-8 text-muted">Eğitmen kaydı bulunamadı.</div>;

  return (
    <ProfilClient
      trainerId={trainer.id}
      initial={{
        name: trainer.user.name,
        phone: trainer.user.phone ?? "",
        avatarUrl: trainer.user.avatarUrl,
        bio: trainer.bio ?? "",
        specialty: trainer.specialty ?? "",
        experience: trainer.experience,
      }}
    />
  );
}
