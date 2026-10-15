import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { macrosFor } from "@/lib/nutrition";

function parseDate(s: string | null): Date {
  // YYYY-MM-DD → date-only (UTC gece yarısı)
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + "T00:00:00.000Z");
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

async function getMember(userSub: string) {
  return prisma.member.findUnique({ where: { userId: userSub }, select: { id: true } });
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const member = await getMember(user.sub);
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const date = parseDate(req.nextUrl.searchParams.get("date"));

    const [logs, water] = await Promise.all([
      prisma.foodLog.findMany({ where: { memberId: member.id, date }, orderBy: { createdAt: "asc" } }),
      prisma.waterLog.findUnique({ where: { memberId_date: { memberId: member.id, date } } }),
    ]);

    return NextResponse.json({ logs, waterMl: water?.amountMl ?? 0 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const member = await getMember(user.sub);
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const body = await req.json();
    const { date: dateStr, type, foodId, name, grams } = body;

    if (!["BREAKFAST", "LUNCH", "DINNER", "SNACK"].includes(type)) {
      return NextResponse.json({ error: "Geçersiz öğün" }, { status: 400 });
    }
    const g = Number(grams);
    if (!g || g <= 0 || g > 5000) return NextResponse.json({ error: "Geçersiz miktar" }, { status: 400 });

    const date = parseDate(typeof dateStr === "string" ? dateStr : null);

    let snapName = typeof name === "string" ? name.trim().slice(0, 120) : "";
    let macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

    if (foodId) {
      const food = await prisma.food.findFirst({
        where: { id: foodId, OR: [{ isPublic: true }, { createdById: user.sub }] },
      });
      if (!food) return NextResponse.json({ error: "Besin bulunamadı" }, { status: 404 });
      snapName = food.name;
      macros = macrosFor({ kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat }, g);
    }

    if (!snapName) return NextResponse.json({ error: "Besin adı gerekli" }, { status: 400 });

    const log = await prisma.foodLog.create({
      data: {
        memberId: member.id,
        date,
        type,
        foodId: foodId || null,
        name: snapName,
        grams: g,
        kcal: macros.kcal,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
      },
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (e) {
    console.error("[panel/nutrition POST]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const member = await getMember(user.sub);
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

    await prisma.foodLog.deleteMany({ where: { id, memberId: member.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
