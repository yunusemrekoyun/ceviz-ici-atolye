import { NextResponse, type NextRequest } from "next/server";
import type { ZodSchema } from "zod";

export type ApiContext = {
  params?: Promise<Record<string, string>>;
};

// Standart hata yanıtı formatı
export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

// Zod validation helper — parse eder, hata varsa 400 döner
export async function validate<T>(
  schema: ZodSchema<T>,
  req: NextRequest
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return {
        data: null,
        error: err(result.error.issues[0]?.message ?? "Geçersiz veri"),
      };
    }
    return { data: result.data, error: null };
  } catch {
    return { data: null, error: err("Geçersiz JSON") };
  }
}

// Route handler wrapper — try/catch + standart 500
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyContext = any;

export function withHandler(
  handler: (req: NextRequest, ctx: AnyContext) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: AnyContext) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      console.error("[API Error]", e);
      return err("Sunucu hatası", 500);
    }
  };
}
