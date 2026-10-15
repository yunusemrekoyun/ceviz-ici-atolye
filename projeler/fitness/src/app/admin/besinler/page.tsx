import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { BesinlerClient } from "@/components/admin/BesinlerClient";

export const metadata = { title: "Besinler" };

export default async function BesinlerPage() {
  await requireAdmin();
  const foods = await prisma.food.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return <BesinlerClient initialFoods={JSON.parse(JSON.stringify(foods))} />;
}
