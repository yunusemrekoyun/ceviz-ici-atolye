// src/components/ContactForm.jsx
import { useState } from "react";
import { IconMail } from "@tabler/icons-react";
import emailjs from "@emailjs/browser";

export default function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk(false);

    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    if (fd.get("company")) return; // honeypot

    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const subject = String(fd.get("subject") || "").trim();
    const message = String(fd.get("message") || "").trim();

    if (!name || !email || !subject || !message) {
      setErr("Lütfen zorunlu alanları doldurun.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setErr("Lütfen geçerli bir e-posta adresi yazın.");
      return;
    }

    try {
      setBusy(true);

      // EmailJS: input isimlerini değiştirmeden template parametrelerine map’liyoruz
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          from_name: name,
          from_email: email,
          phone,
          subject,
          message,
        },
        { publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY }
      );

      setOk(true);
      formEl.reset();
    } catch (errObj) {
      console.error("EmailJS error:", errObj);
      setErr(
        errObj?.message ||
          "Gönderim sırasında bir sorun oluştu. Lütfen tekrar deneyin."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section-y border-t border-border/50" id="contact">
      <div className="container-x">
        <header className="mb-8 sm:mb-10">
          <h2 className="text-[28px] sm:text-[32px] md:text-[34px] font-semibold tracking-[-0.01em]">
            İletişim Formu
          </h2>
          <p className="mt-2 text-[15px] sm:text-[16.5px] text-foreground/80">
            Kısa bir not bırakın, size dönüş yapalım.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2">
          <div className="rounded-[var(--radius-2xl)] border border-border/60 bg-[color:var(--color-surface-2)]/70 p-5 sm:p-6 md:p-7 shadow-[var(--shadow-soft)]">
            <form
              className="grid grid-cols-1 gap-5 sm:gap-6"
              aria-label="İletişim formu"
              onSubmit={onSubmit}
              noValidate
            >
              {ok && (
                <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  Mesajınız alındı. En kısa sürede dönüş yapacağız.
                </div>
              )}
              {err && (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {err}
                </div>
              )}

              <div className="hidden">
                <label>
                  Şirket
                  <input
                    type="text"
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
                <Field label="İsim Soyisim">
                  <input
                    type="text"
                    className="inp"
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={120}
                  />
                </Field>
                <Field label="E-posta">
                  <input
                    type="email"
                    className="inp"
                    name="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    maxLength={160}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
                <Field label="Telefon (opsiyonel)">
                  <input
                    type="tel"
                    className="inp"
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={30}
                  />
                </Field>
                <Field label="Konu">
                  <input
                    type="text"
                    className="inp"
                    name="subject"
                    required
                    maxLength={140}
                  />
                </Field>
              </div>

              <Field label="Mesaj">
                <textarea
                  rows={6}
                  className="inp resize-y"
                  name="message"
                  required
                  maxLength={4000}
                />
              </Field>

              <div className="mt-1.5 flex justify-end">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] px-5 py-3 text-[14.5px] sm:text-[15px] font-medium text-black shadow-[var(--shadow-soft)] ring-1 transition-[opacity,filter] hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-60"
                  style={{
                    backgroundImage: "var(--gradient-accent)",
                    borderColor: "rgba(228,189,99,.35)",
                  }}
                >
                  <IconMail className="h-[18px] w-[18px]" />
                  {busy ? "Gönderiliyor…" : "Gönder"}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-[var(--radius-2xl)] border border-border/60 bg-[color:var(--color-surface-2)]/70 p-4 md:p-5 shadow-[var(--shadow-soft)]">
            <h3 className="px-1 pb-3 text-[17px] sm:text-[18px] font-semibold">
              Ofis Konumu
            </h3>
            <div
              className="relative w-full overflow-hidden rounded-xl border border-border/60 shadow"
              style={{ paddingBottom: "62%" }}
            >
              <iframe
                title="Ofis Konumu"
                className="absolute inset-0 h-full w-full"
                src="https://www.google.com/maps?q=%C4%B0hsaniye+Mahallesi+Bah%C3%A7eler+Cad.+Ofis+Royal+%C4%B0%C5%9F+Merkezi+No:22+K:1/11+Akdeniz/MERS%C4%B0N&output=embed"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <p className="mt-3 px-1 text-sm sm:text-[13.5px] text-foreground/80 break-words hyphens-auto">
              İhsaniye Mahallesi Bahçeler Cad. Ofis Royal İş Merkezi No:22
              K:1/11 Akdeniz / Mersin
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-2 text-[12.5px] sm:text-[13.5px] text-foreground/70">
        {label}
      </div>
      {children}
    </label>
  );
}
