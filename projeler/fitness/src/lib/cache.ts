import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

// Plans and branches change rarely — cache for 5 minutes
export const getCachedPlans = unstable_cache(
  async () => {
    return prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
  },
  ["plans"],
  { revalidate: 300, tags: ["plans"] }
);

export const getCachedBranches = unstable_cache(
  async () => {
    return prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true, city: true },
      orderBy: { name: "asc" },
    });
  },
  ["branches"],
  { revalidate: 300, tags: ["branches"] }
);

export const getCachedActiveTrainers = unstable_cache(
  async () => {
    return prisma.trainer.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true, avatarUrl: true } } },
    });
  },
  ["trainers-active"],
  { revalidate: 300, tags: ["trainers"] }
);
