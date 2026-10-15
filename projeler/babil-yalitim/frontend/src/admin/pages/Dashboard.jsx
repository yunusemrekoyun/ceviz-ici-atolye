// src/admin/pages/Dashboard.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api";
import PropTypes from "prop-types";
import { Filter as FilterIcon, Gauge, MousePointer2, Timer } from "lucide-react";

// Recharts
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
} from "recharts";
import { getAdminFeedbackMessage } from "../utils/mediaFeedback";

/** ---------- Yardımcılar ---------- */
const fmtDate = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toLocaleDateString("tr-TR");
};

// Detay rotaları önce, liste rotaları sonra (sıra ÖNEMLİ)
const TR_PATH_MAP = [
  { test: /^\/$/, label: "Ana Sayfa" },
  { test: /^\/home(?:\/|$)/i, label: "Ana Sayfa" },

  // --- Detay sayfaları ---
  { test: /^\/project[-/]detail(?:\/|$)/i, label: "Proje Detayı" },
  { test: /^\/projects?\/[^/]+(?:\/|$)/i, label: "Proje Detayı" },

  { test: /^\/blog[-/]detail(?:\/|$)/i, label: "Blog Detayı" },
  { test: /^\/blog\/[^/]+(?:\/|$)/i, label: "Blog Detayı" },

  { test: /^\/journal[-/]detail(?:\/|$)/i, label: "Haber Detayı" },
  { test: /^\/journals?\/[^/]+(?:\/|$)/i, label: "Haber Detayı" },

  // (İstersen)
  { test: /^\/service[-/]detail(?:\/|$)/i, label: "Hizmet Detayı" },
  { test: /^\/services?\/[^/]+(?:\/|$)/i, label: "Hizmet Detayı" },

  // --- Liste/ana rotalar ---
  { test: /^\/projects?(?:\/|$)/i, label: "Projeler" },
  { test: /^\/blog(?:\/|$)/i, label: "Blog" },
  { test: /^\/journals?(?:\/|$)/i, label: "Haberler" },
  { test: /^\/services?(?:\/|$)/i, label: "Hizmetler" },
  { test: /^\/(?:contact|iletisim)(?:\/|$)/i, label: "İletişim" },
  { test: /^\/about(?:\/|$)/i, label: "Hakkımızda" },
];

const trPathLabel = (path = "") => {
  for (const { test, label } of TR_PATH_MAP) {
    if (test.test(path)) return label;
  }
  return path || "-";
};

const toQuery = (filters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.append(k, v);
  });
  return params.toString();
};

const PIE_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const CHART_TOOLTIP_PROPS = {
  contentStyle: {
    background: "rgba(15, 23, 42, 0.96)",
    color: "#f8fafc",
    borderRadius: 14,
    border: "1px solid rgba(148, 163, 184, 0.24)",
    boxShadow: "0 18px 40px -24px rgba(15, 23, 42, 0.85)",
  },
  labelStyle: {
    color: "#e2e8f0",
    fontWeight: 600,
    marginBottom: 6,
  },
  itemStyle: {
    color: "#f8fafc",
  },
  cursor: {
    fill: "rgba(99, 102, 241, 0.12)",
  },
};

const toIsoDay = (date) => {
  const x = new Date(date);
  const year = x.getFullYear();
  const month = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** ---------- Dashboard ---------- */
const Dashboard = () => {
  // Filtreler
  const [from, setFrom] = useState(""); // YYYY-MM-DD
  const [to, setTo] = useState("");
  const [section, setSection] = useState(""); // blog|journal|projects|services|home|other
  const [device, setDevice] = useState(""); // desktop|mobile|tablet
  const [country, setCountry] = useState("");
  const [path, setPath] = useState("");

  // Data states
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [summary, setSummary] = useState({
    total: 0,
    avgDuration: 0,
    avgScroll: 0,
    bySection: [],
    byDevice: [],
  });
  const [topPages, setTopPages] = useState([]);
  const [series, setSeries] = useState([]); // {date, count}
  const [recent, setRecent] = useState([]); // son kayıtlar liste
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentErr, setRecentErr] = useState("");
  const [recentPage, setRecentPage] = useState(1);
  const RECENT_PAGE_SIZE = 20;

  const filters = useMemo(
    () => ({ from, to, section, device, country, path }),
    [from, to, section, device, country, path]
  );

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setErr("");

      const qs = toQuery(filters);
      const [summaryRes, topRes, tsRes] = await Promise.all([
        api.get(`/visits/summary${qs ? `?${qs}` : ""}`),
        api.get(`/visits/top-pages${qs ? `?${qs}` : ""}`),
        api.get(`/visits/timeseries${qs ? `?${qs}` : ""}`),
      ]);

      setSummary({
        total: summaryRes.data?.total || 0,
        avgDuration: summaryRes.data?.avgDuration || 0,
        avgScroll: summaryRes.data?.avgScroll || 0,
        bySection: Array.isArray(summaryRes.data?.bySection) ? summaryRes.data.bySection : [],
        byDevice: Array.isArray(summaryRes.data?.byDevice) ? summaryRes.data.byDevice : [],
      });

      setTopPages(Array.isArray(topRes.data) ? topRes.data : []);
      setSeries(Array.isArray(tsRes.data) ? tsRes.data : []);
    } catch (e) {
      console.error("Analytics fetch error:", e?.response?.data || e);
      setErr(
        getAdminFeedbackMessage(
          e,
          "Veriler alınamadı. Lütfen daha sonra tekrar deneyin."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchRecent = useCallback(async () => {
    try {
      setRecentLoading(true);
      setRecentErr("");
      const defaultFrom = filters.from || toIsoDay(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const qs = toQuery({ ...filters, from: defaultFrom, limit: 1000 });
      const { data } = await api.get(`/visits${qs ? `?${qs}` : ""}`);
      setRecent(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Recent fetch error:", e?.response?.data || e);
      setRecentErr(
        getAdminFeedbackMessage(
          e,
          "Son ziyaretler alınamadı. Lütfen filtreleri kontrol edip tekrar deneyin."
        )
      );
    } finally {
      setRecentLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAll();
    fetchRecent();
  }, [fetchAll, fetchRecent]);

  // Pie chart dataları normalize
  const pieSectionData = useMemo(
    () => summary.bySection.map((x) => ({ name: x._id || "Diğer", value: x.count })),
    [summary.bySection]
  );
  const pieDeviceData = useMemo(
    () => summary.byDevice.map((x) => ({ name: x._id || "Diğer", value: x.count })),
    [summary.byDevice]
  );

  // Son 15 gün filtresi + pagination için veriyi hazırla
  const recentFiltered = useMemo(() => {
    const cutoff = Date.now() - 15 * 24 * 60 * 60 * 1000; // 15 gün
    return (recent || []).filter((r) => {
      const d = new Date(r.createdAt);
      return !Number.isNaN(d.getTime()) && d.getTime() >= cutoff;
    });
  }, [recent]);

  const recentShowPager = recentFiltered.length > 40;
  const recentTotalPages = recentShowPager
    ? Math.max(1, Math.ceil(recentFiltered.length / RECENT_PAGE_SIZE))
    : 1;

  useEffect(() => {
    // filtre değiştiğinde sayfayı başa al
    setRecentPage(1);
  }, [from, to, section, device, country, path, recentFiltered.length]);

  const safeRecentPage = Math.min(recentPage, recentTotalPages);
  const recentRows = recentShowPager
    ? recentFiltered.slice(
        (safeRecentPage - 1) * RECENT_PAGE_SIZE,
        safeRecentPage * RECENT_PAGE_SIZE
      )
    : recentFiltered;

  return (
    <div className="p-4 sm:p-6 overflow-x-hidden space-y-6">
      <Header />

      <FilterBar
        from={from}
        to={to}
        section={section}
        device={device}
        country={country}
        path={path}
        onChange={{ setFrom, setTo, setSection, setDevice, setCountry, setPath }}
        onClear={() => {
          setFrom("");
          setTo("");
          setSection("");
          setDevice("");
          setCountry("");
          setPath("");
        }}
      />

      {err ? (
        <div className="admin-card border-red-200/80 bg-red-50/80 p-4 text-red-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
          {err}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Toplam Ziyaret"
              value={summary.total}
              tone="indigo"
              icon={Gauge}
            />
            <StatCard
              title="Ortalama Süre (sn)"
              value={summary.avgDuration}
              tone="amber"
              icon={Timer}
            />
            <StatCard
              title="Ortalama Scroll (%)"
              value={summary.avgScroll}
              tone="emerald"
              icon={MousePointer2}
            />
            <StatCard
              title="Aktif Filtre"
              value={Object.values(filters).some(Boolean) ? "Filtrelenmiş" : "Yok"}
              subtle
              tone="slate"
              icon={FilterIcon}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card title="Ziyaret Zaman Serisi" loading={loading}>
              <div className="h-72 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <defs>
                      <linearGradient id="visitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#cbd5e1" opacity={0.35} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#475569" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#475569" }} />
                    <Tooltip
                      {...CHART_TOOLTIP_PROPS}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Ziyaret"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#0ea5e9", strokeWidth: 1, stroke: "#fff" }}
                      activeDot={{ r: 6, fill: "#0ea5e9", strokeWidth: 0 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="none"
                      fillOpacity={1}
                      fill="url(#visitGradient)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Bölüme Göre Dağılım" loading={loading}>
              <div className="h-72 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieSectionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={105}
                      paddingAngle={3}
                      cornerRadius={6}
                      labelLine={false}
                      label={({ percent }) => `${Math.round(percent * 100)}%`}
                    >
                      {pieSectionData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...CHART_TOOLTIP_PROPS}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Cihaza Göre Dağılım" loading={loading}>
              <div className="h-72 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieDeviceData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={105}
                      paddingAngle={3}
                      cornerRadius={6}
                      labelLine={false}
                      label={({ percent }) => `${Math.round(percent * 100)}%`}
                    >
                      {pieDeviceData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...CHART_TOOLTIP_PROPS}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="En Popüler Sayfalar" loading={loading}>
              <TopPagesTable rows={topPages} />
            </Card>

            <Card title="Son Ziyaretler" loading={recentLoading}>
              {recentErr ? (
                <div className="mb-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                  {recentErr}
                </div>
              ) : null}
              <RecentTable rows={recentRows} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span>
                  Son 15 gün: {recentFiltered.length} kayıt
                  {recentShowPager ? " • Sayfalı görünüm" : ""}
                </span>
                {recentShowPager && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg border border-slate-200/70 bg-white/70 text-slate-700 hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                      onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
                      disabled={safeRecentPage === 1}
                    >
                      Önceki
                    </button>
                    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                      {safeRecentPage} / {recentTotalPages}
                    </span>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg border border-slate-200/70 bg-white/70 text-slate-700 hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                      onClick={() =>
                        setRecentPage((p) => Math.min(recentTotalPages, p + 1))
                      }
                      disabled={safeRecentPage === recentTotalPages}
                    >
                      Sonraki
                    </button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

/** ---------- Header ---------- */
const Header = () => (
  <div className="admin-section p-4 sm:p-5 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-slate-500/12 via-transparent to-slate-400/10 dark:from-[#2c2f36]/60 dark:via-transparent dark:to-[#1f2227]/50" />
    <div className="relative flex flex-wrap items-center justify-between gap-4">
      <div>
        <span className="badge-soft">Analytics</span>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
          Kontrol Merkezi
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ziyaret verilerini filtreleyin, trendleri ve popüler sayfaları inceleyin.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="admin-pill">Canlı</span>
        <span className="admin-pill">Grafikler</span>
      </div>
    </div>
  </div>
);

/** ---------- FilterBar ---------- */
const FilterBar = ({ from, to, section, device, country, path, onChange, onClear }) => {
  const inputCls =
    "min-w-0 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/30";
  const hasFilters = [from, to, section, device, country, path].some(Boolean);
  return (
    <div className="admin-card p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
        <div className="flex flex-col">
          <label className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Başlangıç
          </label>
          <input type="date" value={from} onChange={(e) => onChange.setFrom(e.target.value)} className={inputCls} />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Bitiş
          </label>
          <input type="date" value={to} onChange={(e) => onChange.setTo(e.target.value)} className={inputCls} />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Bölüm
          </label>
          <select value={section} onChange={(e) => onChange.setSection(e.target.value)} className={inputCls}>
            <option value="">Tümü</option>
            <option value="home">Ana Sayfa</option>
            <option value="blog">Blog</option>
            <option value="journal">Journal</option>
            <option value="projects">Projeler</option>
            <option value="services">Hizmetler</option>
            <option value="other">Diğer</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Cihaz
          </label>
          <select value={device} onChange={(e) => onChange.setDevice(e.target.value)} className={inputCls}>
            <option value="">Tümü</option>
            <option value="desktop">Masaüstü</option>
            <option value="mobile">Mobil</option>
            <option value="tablet">Tablet</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Ülke (ISO)
          </label>
          <input
            value={country}
            onChange={(e) => onChange.setCountry(e.target.value.toUpperCase())}
            placeholder="Örn: TR"
            className={inputCls}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Path
          </label>
          <input
            value={path}
            onChange={(e) => onChange.setPath(e.target.value)}
            placeholder="/blog veya /services"
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onClear} className="btn-admin-ghost">
          Filtreleri Temizle
        </button>
        {hasFilters && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Aktif filtreler uygulanıyor
          </span>
        )}
      </div>
    </div>
  );
};

/** ---------- StatCard ---------- */
const StatCard = ({ title, value, subtle = false, tone = "indigo", icon: Icon }) => {
  const palette = {
    indigo: {
      light: "from-indigo-500/90 via-sky-400/90 to-blue-400/90",
      dark: "from-indigo-500/60 via-sky-500/60 to-blue-500/60",
    },
    amber: {
      light: "from-amber-400/90 via-orange-400/90 to-amber-300/90",
      dark: "from-amber-500/70 via-orange-500/70 to-amber-400/70",
    },
    emerald: {
      light: "from-emerald-400/90 via-teal-400/90 to-emerald-300/90",
      dark: "from-emerald-500/70 via-teal-500/70 to-emerald-400/70",
    },
    slate: {
      light: "from-slate-100 via-white to-white",
      dark: "from-[#1c1f24] via-[#1a1d22] to-[#171a1f]",
    },
  };
  const bg = palette[tone] || palette.slate;

  return (
    <div className="admin-card p-4 relative overflow-hidden">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${bg.light} dark:${bg.dark}`}
      />
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_20%_20%,white,transparent_28%),radial-gradient(circle_at_80%_0%,white,transparent_25%)] dark:opacity-10" />
      <div className="relative flex items-start justify-between gap-3 text-slate-900 dark:text-slate-50">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            {title}
          </div>
          <div
            className={`mt-2 text-3xl font-semibold ${
              subtle ? "text-slate-800 dark:text-slate-50" : "text-slate-900 dark:text-white"
            }`}
          >
            {value}
          </div>
        </div>
        {Icon ? (
          <div className="h-11 w-11 rounded-2xl bg-white/80 grid place-items-center text-slate-700 shadow-md border border-white/60 dark:bg-slate-900/70 dark:text-slate-100 dark:border-slate-800/60">
            <Icon size={18} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** ---------- Card ---------- */
const Card = ({ title, loading, children }) => (
  <div className="admin-card p-4 sm:p-5 overflow-hidden">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow shadow-emerald-400/40" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      {loading ? <span className="text-xs text-slate-500">Yükleniyor…</span> : null}
    </div>
    {children}
  </div>
);

/** ---------- TopPagesTable ---------- */
const TopPagesTable = ({ rows }) => {
  if (!rows?.length) return <div className="text-sm text-slate-500 dark:text-slate-300">Kayıt yok.</div>;
  return (
    // -mx-4: container padding’ini nötrle; overflow-x sadece tabloda
    <div className="-mx-4 sm:mx-0 overflow-x-auto">
      <table className="min-w-[640px] w-full text-sm">
        <thead className="text-left text-slate-500 dark:text-slate-300">
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="py-2 pr-3 font-semibold">Path</th>
            <th className="py-2 pr-3 font-semibold">Ziyaret</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r, i) => (
            <tr
              key={i}
              className="transition hover:bg-indigo-50/60 dark:hover:bg-slate-800/40"
            >
              <td className="py-3 pr-3 text-slate-800 dark:text-slate-100">
                <span title={r.path}>{trPathLabel(r.path)}</span>
              </td>
              <td className="py-3 pr-3 text-slate-800 dark:text-slate-100">
                {r.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** ---------- RecentTable ---------- */
const RecentTable = ({ rows }) => {
  if (!rows?.length) return <div className="text-sm text-slate-500 dark:text-slate-300">Kayıt yok.</div>;
  return (
    <div className="-mx-4 sm:mx-0 overflow-x-auto">
      <table className="min-w-[720px] w-full text-sm">
        <thead className="text-left text-slate-500 dark:text-slate-300">
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="py-2 pr-3 font-semibold">Tarih</th>
            <th className="py-2 pr-3 font-semibold">Path</th>
            <th className="py-2 pr-3 font-semibold">Cihaz</th>
            <th className="py-2 pr-3 font-semibold">Ülke</th>
            <th className="py-2 pr-3 font-semibold">Süre (sn)</th>
            <th className="py-2 pr-3 font-semibold">Scroll (%)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r) => (
            <tr
              key={r._id}
              className="transition hover:bg-indigo-50/60 dark:hover:bg-slate-800/40"
            >
              <td className="py-3 pr-3 whitespace-nowrap text-slate-800 dark:text-slate-100">
                {fmtDate(r.createdAt)}
              </td>
              <td className="py-3 pr-3 text-slate-800 dark:text-slate-100">
                <span title={r.path}>{trPathLabel(r.path)}</span>
              </td>
              <td className="py-3 pr-3 text-slate-800 dark:text-slate-100">{r.device || "-"}</td>
              <td className="py-3 pr-3 text-slate-800 dark:text-slate-100">{r.country || "-"}</td>
              <td className="py-3 pr-3 text-slate-800 dark:text-slate-100">{Number(r.duration || 0)}</td>
              <td className="py-3 pr-3 text-slate-800 dark:text-slate-100">
                {Number(r.scrollDepth || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** ---------- PropTypes ---------- */
FilterBar.propTypes = {
  from: PropTypes.string,
  to: PropTypes.string,
  section: PropTypes.string,
  device: PropTypes.string,
  country: PropTypes.string,
  path: PropTypes.string,
  onChange: PropTypes.shape({
    setFrom: PropTypes.func.isRequired,
    setTo: PropTypes.func.isRequired,
    setSection: PropTypes.func.isRequired,
    setDevice: PropTypes.func.isRequired,
    setCountry: PropTypes.func.isRequired,
    setPath: PropTypes.func.isRequired,
  }).isRequired,
  onClear: PropTypes.func.isRequired,
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtle: PropTypes.bool,
  tone: PropTypes.oneOf(["indigo", "amber", "emerald", "slate"]),
  icon: PropTypes.elementType,
};

Card.propTypes = {
  title: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  children: PropTypes.node,
};

TopPagesTable.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    })
  ),
};

RecentTable.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      path: PropTypes.string,
      device: PropTypes.string,
      country: PropTypes.string,
      duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      scrollDepth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ),
};

export default Dashboard;
