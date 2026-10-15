"use client";

import { useState } from "react";
import { Save, Loader2, ShieldCheck, Wifi, WifiOff, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

type Provider = "IYZICO" | "PAYTR";

interface Config {
  isOnlineEnabled: boolean;
  provider: Provider | null;
  iyzico: { apiKey: string; secretKey: string; baseUrl: string };
  paytr:  { merchantId: string; merchantKey: string; merchantSalt: string };
}

export function PaymentConfigClient({ initial }: { initial: Config }) {
  const { toast } = useToast();
  const [cfg, setCfg]     = useState<Config>(initial);
  const [saving, setSaving] = useState(false);
  const [show, setShow]   = useState<Record<string, boolean>>({});

  const set = (path: string, val: any) => {
    const keys = path.split(".");
    setCfg((prev) => {
      const next = structuredClone(prev) as any;
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = val;
      return next;
    });
  };

  const toggle = (key: string) => setShow((s) => ({ ...s, [key]: !s[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payment-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      if (!res.ok) throw new Error("Kaydedilemedi");
      toast({ type: "success", message: "Ödeme ayarları kaydedildi." });
    } catch (e: any) {
      toast({ type: "error", message: e.message });
    } finally {
      setSaving(false);
    }
  };

  const isConfigured =
    cfg.isOnlineEnabled &&
    cfg.provider &&
    (cfg.provider === "IYZICO"
      ? cfg.iyzico.apiKey && cfg.iyzico.secretKey
      : cfg.paytr.merchantId && cfg.paytr.merchantKey && cfg.paytr.merchantSalt);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Durum banner */}
      <div className={`card-surface p-4 flex items-center gap-3 ${isConfigured ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
        {isConfigured
          ? <Wifi className="w-5 h-5 text-emerald-400 shrink-0" />
          : <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />}
        <div>
          <div className="text-sm font-medium">
            {isConfigured ? "Online ödeme aktif ve yapılandırılmış" : "Online ödeme devre dışı veya yapılandırılmamış"}
          </div>
          <div className="text-xs text-muted">
            {isConfigured
              ? `Sağlayıcı: ${cfg.provider}`
              : "Kullanıcılar ödeme yapamaz — firma iletişim bilgileri gösterilir"}
          </div>
        </div>
      </div>

      {/* Online ödeme toggle */}
      <div className="card-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Online Ödeme</div>
            <div className="text-xs text-muted mt-0.5">Kapalıysa kullanıcı paket seçince firma bilgileriniz gösterilir</div>
          </div>
          <button
            type="button"
            onClick={() => set("isOnlineEnabled", !cfg.isOnlineEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${cfg.isOnlineEnabled ? "bg-neon" : "bg-subtle-md"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${cfg.isOnlineEnabled ? "translate-x-6" : ""}`} />
          </button>
        </div>
      </div>

      {/* Sağlayıcı seçimi */}
      {cfg.isOnlineEnabled && (
        <div className="card-surface p-5">
          <div className="font-medium mb-4">Ödeme Sağlayıcısı</div>
          <div className="grid grid-cols-2 gap-3">
            {(["IYZICO", "PAYTR"] as Provider[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set("provider", p)}
                className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${
                  cfg.provider === p
                    ? "border-neon bg-neon/5"
                    : "border-subtle hover:border-subtle-md"
                }`}
              >
                <ProviderLogo provider={p} />
                <span className="text-sm font-medium">{p === "IYZICO" ? "iyzico" : "PayTR"}</span>
                {cfg.provider === p && (
                  <span className="text-[10px] text-neon font-semibold uppercase tracking-wider">Seçili</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* iyzico ayarları */}
      {cfg.isOnlineEnabled && cfg.provider === "IYZICO" && (
        <div className="card-surface p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-neon" />
            <span className="font-medium">iyzico Anahtarları</span>
            <span className="text-xs text-muted ml-auto">iyzipay.com → Ayarlar → API</span>
          </div>
          <SecretField
            label="API Key"
            value={cfg.iyzico.apiKey}
            onChange={(v) => set("iyzico.apiKey", v)}
            id="iyzico-api"
            show={show["iyzico-api"]}
            onToggle={() => toggle("iyzico-api")}
          />
          <SecretField
            label="Secret Key"
            value={cfg.iyzico.secretKey}
            onChange={(v) => set("iyzico.secretKey", v)}
            id="iyzico-secret"
            show={show["iyzico-secret"]}
            onToggle={() => toggle("iyzico-secret")}
          />
          <div>
            <label className="label-base">Ortam</label>
            <select
              className="input-base"
              value={cfg.iyzico.baseUrl}
              onChange={(e) => set("iyzico.baseUrl", e.target.value)}
            >
              <option value="https://sandbox-api.iyzipay.com">Sandbox (Test)</option>
              <option value="https://api.iyzipay.com">Production (Canlı)</option>
            </select>
          </div>
        </div>
      )}

      {/* PayTR ayarları */}
      {cfg.isOnlineEnabled && cfg.provider === "PAYTR" && (
        <div className="card-surface p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-neon" />
            <span className="font-medium">PayTR Anahtarları</span>
            <span className="text-xs text-muted ml-auto">paytr.com → Mağaza Ayarları → API</span>
          </div>
          <SecretField
            label="Merchant ID"
            value={cfg.paytr.merchantId}
            onChange={(v) => set("paytr.merchantId", v)}
            id="paytr-mid"
            show={show["paytr-mid"]}
            onToggle={() => toggle("paytr-mid")}
          />
          <SecretField
            label="Merchant Key"
            value={cfg.paytr.merchantKey}
            onChange={(v) => set("paytr.merchantKey", v)}
            id="paytr-key"
            show={show["paytr-key"]}
            onToggle={() => toggle("paytr-key")}
          />
          <SecretField
            label="Merchant Salt"
            value={cfg.paytr.merchantSalt}
            onChange={(v) => set("paytr.merchantSalt", v)}
            id="paytr-salt"
            show={show["paytr-salt"]}
            onToggle={() => toggle("paytr-salt")}
          />
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary btn-md min-w-[130px]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Kaydet</>}
        </button>
      </div>
    </div>
  );
}

function SecretField({
  label, value, onChange, id, show, onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  id: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="label-base">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className="input-base pr-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Değeri girin veya boş bırakın (mevcut korunur)"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-dim"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function ProviderLogo({ provider }: { provider: Provider }) {
  if (provider === "IYZICO") {
    return (
      <div className="w-12 h-12 rounded-xl bg-[#1A237E]/20 grid place-items-center">
        <span className="text-sm font-bold text-blue-300">iyz</span>
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 grid place-items-center">
      <span className="text-sm font-bold text-emerald-400">PTR</span>
    </div>
  );
}
