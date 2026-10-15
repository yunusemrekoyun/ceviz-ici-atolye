import { prisma } from "@/lib/prisma";
import { QrScanner } from "@/components/admin/QrScanner";

export default async function QrScanPage() {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <QrScanner branches={branches} />;
}
