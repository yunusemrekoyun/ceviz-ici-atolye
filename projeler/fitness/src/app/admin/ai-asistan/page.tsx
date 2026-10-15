import { PageHeader } from "@/components/admin/PageHeader";
import { Bot, Sparkles, Brain, Salad } from "lucide-react";

export default function AIPage() {
  return (
    <div>
      <PageHeader
        title="AI Asistan"
        subtitle="Yapay zeka destekli antrenman ve beslenme önerileri"
      />

      <div className="card-surface p-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon/15 text-neon text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" /> YAKINDA
        </div>
        <h2 className="h-display text-3xl mt-4">OpenAI entegrasyonu hazırlanıyor</h2>
        <p className="mt-3 text-body max-w-lg mx-auto">
          Üyeleriniz için kişiye özel AI antrenman programı, beslenme planı ve chatbot asistan modülü.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { icon: Brain, title: "Akıllı Program", desc: "Hedef ve seviyeye göre antrenman planı" },
            { icon: Salad, title: "Beslenme", desc: "Kalori ve makro hesaplı menüler" },
            { icon: Bot, title: "Chatbot", desc: "7/24 üye soru-cevap asistanı" },
          ].map((f) => (
            <div key={f.title} className="rounded-xl p-5 bg-subtle border border-subtle">
              <f.icon className="w-6 h-6 text-neon mx-auto" />
              <div className="mt-3 font-semibold">{f.title}</div>
              <div className="text-xs text-label mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
