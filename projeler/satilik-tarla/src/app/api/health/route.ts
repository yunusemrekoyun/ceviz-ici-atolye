import { NextResponse } from 'next/server';

// Compose healthcheck'i — süreç ayakta ve HTTP cevap veriyor mu.
// DB'ye bakmaz: veri katmanı fallback'liyken app "sağlıklı ama bozuk"
// sayılmasın diye değil, tam tersi; DB kesintisi app'i öldürmemeli.
export function GET() {
  return NextResponse.json({ ok: true });
}
