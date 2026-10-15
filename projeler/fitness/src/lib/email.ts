const RESEND_API_KEY = process.env.RESEND_API_KEY;
// .env'de MAIL_FROM adıyla tanımlı — FROM_EMAIL eski sunucu yapılandırmaları için fallback
const FROM_EMAIL = process.env.MAIL_FROM ?? process.env.FROM_EMAIL ?? "noreply@bahafitness.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL DEV] To: ${payload.to} | Subject: ${payload.subject}`);
    console.log(`[EMAIL DEV] Body: ${payload.html.replace(/<[^>]+>/g, " ")}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, ...payload }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[EMAIL] Resend error:", err);
  }
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const link = `${APP_URL}/eposta-dogrula?token=${token}`;
  await sendEmail({
    to,
    subject: "BahaFitness — E-posta adresinizi doğrulayın",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Merhaba ${name},</h2>
        <p>E-posta adresinizi doğrulamak için aşağıdaki bağlantıya tıklayın:</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#C6FF3D;color:#0a0a0f;border-radius:8px;text-decoration:none;font-weight:bold">
          E-postamı Doğrula
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">Bu bağlantı 24 saat geçerlidir.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const link = `${APP_URL}/sifre-sifirla?token=${token}`;
  await sendEmail({
    to,
    subject: "BahaFitness — Şifre sıfırlama",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Merhaba ${name},</h2>
        <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#C6FF3D;color:#0a0a0f;border-radius:8px;text-decoration:none;font-weight:bold">
          Şifremi Sıfırla
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">Bu bağlantı 1 saat geçerlidir. Şifre sıfırlama talebinde bulunmadıysanız bu e-postayı görmezden gelin.</p>
      </div>
    `,
  });
}

export async function sendTrainerAccountSetupEmail(to: string, name: string, token: string) {
  const link = `${APP_URL}/sifre-sifirla?token=${token}`;
  await sendEmail({
    to,
    subject: "BahaFitness — Eğitmen hesabın oluşturuldu",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Merhaba ${name},</h2>
        <p>BahaFitness'te senin için bir eğitmen hesabı oluşturuldu. Panele giriş yapabilmen için önce bir şifre belirlemen gerekiyor:</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#C6FF3D;color:#0a0a0f;border-radius:8px;text-decoration:none;font-weight:bold">
          Şifremi Belirle
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">Bu bağlantı 1 saat geçerlidir. Süresi dolarsa giriş sayfasındaki "Şifremi unuttum" ile yeni bir bağlantı isteyebilirsin.</p>
      </div>
    `,
  });
}

export async function sendStaffAccountSetupEmail(to: string, name: string, token: string, roleLabel: string) {
  const link = `${APP_URL}/sifre-sifirla?token=${token}`;
  await sendEmail({
    to,
    subject: "BahaFitness — Yönetim hesabın oluşturuldu",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Merhaba ${name},</h2>
        <p>BahaFitness'te senin için bir <strong>${roleLabel}</strong> hesabı oluşturuldu. Panele giriş yapabilmen için önce bir şifre belirlemen gerekiyor:</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#C6FF3D;color:#0a0a0f;border-radius:8px;text-decoration:none;font-weight:bold">
          Şifremi Belirle
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">Bu bağlantı 1 saat geçerlidir. Süresi dolarsa giriş sayfasındaki "Şifremi unuttum" ile yeni bir bağlantı isteyebilirsin.</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  await sendEmail({
    to,
    subject: "BahaFitness'e hoş geldin!",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Hoş geldin, ${name}!</h2>
        <p>BahaFitness ailesine katıldığın için teşekkürler. Üyelik panelinden ders programını takip edebilir, randevu alabilir ve ilerlemeni izleyebilirsin.</p>
        <a href="${APP_URL}/panel" style="display:inline-block;padding:12px 24px;background:#C6FF3D;color:#0a0a0f;border-radius:8px;text-decoration:none;font-weight:bold">
          Panele Git
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">Herhangi bir sorun olursa bize ulaşmaktan çekinme.</p>
      </div>
    `,
  });
}

export async function sendPaymentReceiptEmail(to: string, name: string, data: { invoiceNo: string | null; planName: string; amount: number; currency: string; paidAt: Date }) {
  const formattedAmount = new Intl.NumberFormat("tr-TR", { style: "currency", currency: data.currency }).format(data.amount);
  const formattedDate = data.paidAt.toLocaleString("tr-TR");
  await sendEmail({
    to,
    subject: "BahaFitness — Ödeme onayı",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Ödemen alındı, ${name}</h2>
        <p>Aşağıdaki ödeme başarıyla işlendi:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;color:#666">Plan</td><td style="padding:8px 0;text-align:right;font-weight:bold">${data.planName}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Tutar</td><td style="padding:8px 0;text-align:right;font-weight:bold">${formattedAmount}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Tarih</td><td style="padding:8px 0;text-align:right">${formattedDate}</td></tr>
          ${data.invoiceNo ? `<tr><td style="padding:8px 0;color:#666">Fatura No</td><td style="padding:8px 0;text-align:right;font-family:monospace">${data.invoiceNo}</td></tr>` : ""}
        </table>
        <p style="color:#999;font-size:12px;margin-top:24px">Bu e-postayı ödeme kaydın olarak saklayabilirsin.</p>
      </div>
    `,
  });
}

export async function sendReferralRewardEmail(to: string, name: string, rewardDays: number) {
  await sendEmail({
    to,
    subject: "BahaFitness — Davetin karşılığını aldın!",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>İyi haber, ${name}!</h2>
        <p>Davet ettiğin bir arkadaşın ilk ödemesini tamamladı. Teşekkür olarak üyeliğine <strong>${rewardDays} gün</strong> ekledik.</p>
        <p style="color:#999;font-size:12px;margin-top:24px">Arkadaşlarını davet etmeye devam et, panelinden davet kodunu paylaşabilirsin.</p>
      </div>
    `,
  });
}

export async function sendMonthlySummaryEmail(
  to: string,
  name: string,
  data: {
    monthLabel: string;
    checkIns: number;
    workouts: number;
    weightDelta: number | null;
    busiestDay: string | null;
  }
) {
  const rows: string[] = [
    `<tr><td style="padding:8px 0;color:#666">Salona geliş</td><td style="padding:8px 0;text-align:right;font-weight:bold">${data.checkIns} kez</td></tr>`,
  ];
  if (data.workouts > 0) {
    rows.push(`<tr><td style="padding:8px 0;color:#666">Kaydedilen antrenman</td><td style="padding:8px 0;text-align:right;font-weight:bold">${data.workouts}</td></tr>`);
  }
  if (data.weightDelta != null && data.weightDelta !== 0) {
    const sign = data.weightDelta > 0 ? "+" : "";
    rows.push(`<tr><td style="padding:8px 0;color:#666">Kilo değişimi</td><td style="padding:8px 0;text-align:right;font-weight:bold">${sign}${data.weightDelta} kg</td></tr>`);
  }
  if (data.busiestDay) {
    rows.push(`<tr><td style="padding:8px 0;color:#666">En sevdiğin gün</td><td style="padding:8px 0;text-align:right;font-weight:bold">${data.busiestDay}</td></tr>`);
  }

  await sendEmail({
    to,
    subject: `BahaFitness — ${data.monthLabel} özetin`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>${data.monthLabel} nasıl geçti, ${name}?</h2>
        <p>Geçen ayki performansının kısa özeti:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows.join("")}</table>
        <a href="${APP_URL}/panel" style="display:inline-block;padding:12px 24px;background:#C6FF3D;color:#0a0a0f;border-radius:8px;text-decoration:none;font-weight:bold">
          Paneline Git
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">Bu ay da güzel bir seri yakalayalım 💪</p>
      </div>
    `,
  });
}

export async function sendTrainerMonthlySummaryEmail(
  to: string,
  name: string,
  data: {
    monthLabel: string;
    completedSessions: number;
    classesTaught: number;
    avgRating: number | null;
    busiestDay: string | null;
  }
) {
  const rows: string[] = [
    `<tr><td style="padding:8px 0;color:#666">Tamamlanan seans</td><td style="padding:8px 0;text-align:right;font-weight:bold">${data.completedSessions}</td></tr>`,
  ];
  if (data.classesTaught > 0) {
    rows.push(`<tr><td style="padding:8px 0;color:#666">Verilen grup dersi</td><td style="padding:8px 0;text-align:right;font-weight:bold">${data.classesTaught}</td></tr>`);
  }
  if (data.avgRating != null) {
    rows.push(`<tr><td style="padding:8px 0;color:#666">Ay içi ortalama puanın</td><td style="padding:8px 0;text-align:right;font-weight:bold">★ ${data.avgRating}</td></tr>`);
  }
  if (data.busiestDay) {
    rows.push(`<tr><td style="padding:8px 0;color:#666">En yoğun günün</td><td style="padding:8px 0;text-align:right;font-weight:bold">${data.busiestDay}</td></tr>`);
  }

  await sendEmail({
    to,
    subject: `BahaFitness — ${data.monthLabel} eğitmen özetin`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Eline sağlık, ${name}!</h2>
        <p>${data.monthLabel} ayındaki çalışmanın özeti:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows.join("")}</table>
        <a href="${APP_URL}/egitmen" style="display:inline-block;padding:12px 24px;background:#C6FF3D;color:#0a0a0f;border-radius:8px;text-decoration:none;font-weight:bold">
          Paneline Git
        </a>
      </div>
    `,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export async function sendContactNotificationEmail(to: string, data: { name: string; email: string; phone?: string | null; message: string }) {
  await sendEmail({
    to,
    subject: `BahaFitness — Yeni iletişim mesajı: ${escapeHtml(data.name)}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Yeni bir iletişim mesajı var</h2>
        <p><strong>Ad:</strong> ${escapeHtml(data.name)}</p>
        <p><strong>E-posta:</strong> ${escapeHtml(data.email)}</p>
        ${data.phone ? `<p><strong>Telefon:</strong> ${escapeHtml(data.phone)}</p>` : ""}
        <p><strong>Mesaj:</strong></p>
        <p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>
      </div>
    `,
  });
}

export { APP_URL };
