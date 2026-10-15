import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { useState } from "react";
import api from "../../api";
import {
  CONTACT_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_HOURS,
  CONTACT_MAP_URL,
  CONTACT_PHONES,
} from "../../config/site";
import { useLocale } from "../../i18n/LocaleContext.jsx";

const Contact = () => {
  const { locale } = useLocale();
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
    company: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setStatus(null);
      const { data } = await api.post("/contact", form);
      setSubmitting(false);
      setForm({ name: "", email: "", message: "", company: "" });
      setStatus({
        type: "success",
        text:
          data?.message ||
          (locale === "en"
            ? "Your message has been received. We will get back to you shortly."
            : "Mesajiniz alindi. En kisa surede donus yapacagiz."),
      });
    } catch (error) {
      setSubmitting(false);
      setStatus({
        type: "error",
        text:
          error?.response?.data?.message ||
          error?.friendlyMessage ||
          (locale === "en"
            ? "Message could not be sent. Please try again later."
            : "Mesaj gonderilemedi. Lutfen daha sonra tekrar deneyin."),
      });
    }
  };

  const card =
    "rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-md";
  const copy =
    locale === "en"
      ? {
          title: "Contact",
          lead:
            "Let’s talk about the right solutions for your project. Reach us by phone, email, or the contact form.",
          reachUs: "Get in Touch",
          phone: "Phone",
          email: "Email",
          address: "Address",
          hours: "Working Hours",
          map: "Map",
          mapTitle: "Babil Insulation Location",
          sendMessage: "Send a Message",
          fullName: "Full Name",
          emailAddress: "Email Address",
          message: "Message",
          submitting: "Sending...",
          submit: "Send",
          formNote:
            "This form is intended for quick contact only. For detailed quotations, please call us.",
          namePlaceholder: "E.g. John Doe",
          emailPlaceholder: "example@mail.com",
          messagePlaceholder: "Briefly tell us about your needs...",
        }
      : {
          title: "İletişim",
          lead:
            "Projeniz için doğru çözümleri konuşalım. Telefon, e‑posta veya form üzerinden bize ulaşabilirsiniz.",
          reachUs: "Bize Ulaşın",
          phone: "Telefon",
          email: "E‑posta",
          address: "Adres",
          hours: "Çalışma Saatleri",
          map: "Harita",
          mapTitle: "Babil Yalıtım Konumu",
          sendMessage: "Mesaj Gönderin",
          fullName: "Adınız Soyadınız",
          emailAddress: "E‑posta Adresiniz",
          message: "Mesajınız",
          submitting: "Gönderiliyor...",
          submit: "Gönder",
          formNote:
            "Bu form yalnızca hızlı iletişim amaçlıdır. Detaylı teklif için lütfen telefonla arayınız.",
          namePlaceholder: "Örn. Ali Veli",
          emailPlaceholder: "ornek@mail.com",
          messagePlaceholder: "Kısaca bize ihtiyaçlarınızı anlatın…",
        };

  return (
    <div className="max-w-7xl mx-auto py-10 md:py-14 px-4 md:px-8">
      {/* başlık */}
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-3xl md:text-5xl font-bold text-secondaryColor">
          {copy.title}
        </h2>
        <div className="h-1 w-24 bg-quaternaryColor mx-auto mt-3 rounded-full" />
        <p className="text-gray-600 max-w-2xl mx-auto mt-4">
          {copy.lead}
        </p>
      </div>

      {/* içerik grid */}
      <div className="grid lg:grid-cols-2 gap-8 md:gap-10">
        {/* sol: iletişim kartları */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className={`${card} p-6`}>
            <h3 className="text-lg font-semibold text-secondaryColor mb-4">
              {copy.reachUs}
            </h3>
            <ul className="space-y-4 text-gray-800">
              <li className="flex items-start gap-3">
                <span className="p-2 rounded-lg bg-quaternaryColor text-white">
                  <Phone size={18} />
                </span>
                <div>
                  <p className="text-sm text-gray-600 ">{copy.phone}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {CONTACT_PHONES.map((phone) => (
                      <a
                        key={phone.link}
                        href={`tel:${phone.link}`}
                        className="inline-flex items-center rounded-full border border-secondaryColor/15 bg-white/70 px-3 py-1 text-sm font-medium text-secondaryColor transition hover:border-quaternaryColor hover:text-quaternaryColor"
                      >
                        {phone.display}
                      </a>
                    ))}
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="p-2 rounded-lg bg-quaternaryColor text-white">
                  <Mail size={18} />
                </span>
                <div>
                  <p className="text-sm text-gray-600">{copy.email}</p>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="font-medium hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="p-2 rounded-lg bg-quaternaryColor text-white">
                  <MapPin size={18} />
                </span>
                <div>
                  <p className="text-sm text-gray-600">{copy.address}</p>
                  <p className="font-medium">{CONTACT_ADDRESS}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="p-2 rounded-lg bg-quaternaryColor text-white">
                  <Clock size={18} />
                </span>
                <div>
                  <p className="text-sm text-gray-600">{copy.hours}</p>
                  <p className="font-medium">{CONTACT_HOURS}</p>
                </div>
              </li>
            </ul>
          </div>

          <div className={`${card} p-6`}>
            <h3 className="text-lg font-semibold text-secondaryColor mb-4">
              {copy.map}
            </h3>
            <div className="rounded-xl overflow-hidden shadow">
              <iframe
                title={copy.mapTitle}
                src={CONTACT_MAP_URL}
                width="100%"
                height="280"
                allowFullScreen=""
                loading="lazy"
                className="w-full"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </motion.div>

        {/* sağ: form */}
        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          className={`${card} p-6`}
        >
          <h3 className="text-lg font-semibold text-secondaryColor mb-4">
            {copy.sendMessage}
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <input
              type="text"
              name="company"
              value={form.company}
              onChange={onChange}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />
            <label className="block">
              <span className="text-sm text-gray-700">{copy.fullName}</span>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={onChange}
                className="mt-1 w-full p-3 rounded-lg border border-gray-300 bg-white/70 focus:outline-none focus:ring-2 focus:ring-quaternaryColor"
                placeholder={copy.namePlaceholder}
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-700">{copy.emailAddress}</span>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={onChange}
                className="mt-1 w-full p-3 rounded-lg border border-gray-300 bg-white/70 focus:outline-none focus:ring-2 focus:ring-quaternaryColor"
                placeholder={copy.emailPlaceholder}
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-700">{copy.message}</span>
              <textarea
                name="message"
                required
                rows={6}
                value={form.message}
                onChange={onChange}
                className="mt-1 w-full p-3 rounded-lg border border-gray-300 bg-white/70 focus:outline-none focus:ring-2 focus:ring-quaternaryColor resize-y"
                placeholder={copy.messagePlaceholder}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 inline-flex items-center gap-2 bg-quaternaryColor text-white font-semibold py-3 px-5 rounded-lg hover:bg-secondaryColor transition disabled:opacity-60"
          >
            <Send size={18} />
            {submitting ? copy.submitting : copy.submit}
          </button>

          {status && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                status.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {status.text}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3">
            {copy.formNote}
          </p>
        </motion.form>
      </div>
    </div>
  );
};

export default Contact;
