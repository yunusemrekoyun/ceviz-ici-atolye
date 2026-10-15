import { prisma } from "@/lib/prisma";
import { BranchesClient } from "@/components/admin/BranchesClient";

export default async function BranchesPage() {
  const branches = await prisma.branch.findMany({
    include: { _count: { select: { members: true, attendances: true } } },
    orderBy: { name: "asc" },
  });

  return <BranchesClient initialBranches={JSON.parse(JSON.stringify(branches))} />;
}
