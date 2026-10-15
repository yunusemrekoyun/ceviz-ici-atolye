"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  MapPin,
  MessageCircle,
  Phone,
  Shirt,
  Users,
  X,
} from "lucide-react";
import { BRAND_NAME, INSTAGRAM_HANDLE, INSTAGRAM_URL, PUBLIC_FORM_PATH } from "@/lib/constants";
import { formatPhone } from "@/lib/phone";
import { telLink, whatsappLink } from "@/lib/whatsapp";
import type { HomeData, HomeGroup, HomeVenue } from "@/lib/home-data";
import { CallbackForm } from "./CallbackForm";
import { FootballScene } from "./FootballScene";
import { CoachShowcase } from "./CoachShowcase";
import type { HomeCoach } from "@/lib/home-coaches";
import { hasLocalScroll, SectionWheelGesture } from "./section-gestures";
import "./pulse.css";

const DAYS = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];
const SCENES = [
  { id: "okul", label: "Okul", title: "FUTBOL OKULU", visual: 0 },
  { id: "program", label: "Program", title: "OYUN ZAMANI", visual: 1 },
  { id: "hocalar", label: "Hocalar", title: "TEKNİK EKİP", visual: -1 },
  { id: "kayit", label: "Kayıt", title: "İLK ADIM", visual: 2 },
  { id: "iletisim", label: "İletişim", title: "SAHADA BULUŞALIM", visual: 3 },
] as const;

function shortDate(day: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(`${day}T12:00:00+03:00`));
}
function Panel({
  children,
  side,
  label,
}: {
  children: ReactNode;
  side: "left" | "right";
  label: string;
}) {
  return (
    <div className={`pulse-panel pulse-panel--${side}`} aria-label={label}>
      {children}
    </div>
  );
}
function VenueLinks({ venue }: { venue: HomeVenue }) {
  return (
    <div className="pulse-map-links">
      <a href={venue.google} target="_blank" rel="noopener noreferrer">
        Google Haritalar <ArrowUpRight size={13} aria-hidden="true" />
      </a>
      <a href={venue.apple} target="_blank" rel="noopener noreferrer">
        Apple Haritalar <ArrowUpRight size={13} aria-hidden="true" />
      </a>
    </div>
  );
}

/** One gesture selects one section; local information panels retain native scrolling. */
export function HomePage({
  data,
  qrSvg,
  initialYear,
  coaches,
  phone,
}: {
  data: HomeData;
  qrSvg: string;
  initialYear: number | null;
  coaches: readonly HomeCoach[];
  /** Okul telefonu (Ayarlar → Okul iletişim telefonu, 05XXXXXXXXX). */
  phone: string;
}) {
  const WHATSAPP_URL = whatsappLink(phone);
  const hasCoaches = coaches.length > 0;
  const scenes = useMemo(() => SCENES.filter(s => s.id !== "hocalar" || hasCoaches), [hasCoaches]);
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(initialYear === null ? 0 : 1);
  const activeScene = useRef(active);
  const [year, setYear] = useState<number | null>(initialYear);
  const [groupId, setGroupId] = useState<number | null>(() =>
    initialYear === null
      ? (data.groups[0]?.id ?? null)
      : (data.groups.find(
          (g) => initialYear >= g.minYear && initialYear <= g.maxYear,
        )?.id ?? null),
  );
  const pickedGroup =
    year === null
      ? null
      : data.groups.find((g) => year >= g.minYear && year <= g.maxYear);
  const group = data.groups.find((g) => g.id === groupId);

  const go = useCallback((index: number, immediate = false) => {
    const next = Math.max(0, Math.min(scenes.length - 1, index));
    if (next === activeScene.current && !immediate) return;
    // Move focus out of the section before it becomes inert.
    if (next !== activeScene.current && document.activeElement?.closest(".pulse-layer")) {
      root.current?.querySelectorAll<HTMLAnchorElement>(".pulse-nav a")[next]?.focus({ preventScroll: true });
    }
    activeScene.current = next;
    setActive(next);
  }, [scenes.length]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const wheel = new SectionWheelGesture();
    let touch: { x: number; y: number; handled: boolean } | null = null;
    const step = (direction: number) => go(activeScene.current + direction);
    const wheelMove = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || dialog.current?.open || Math.abs(event.deltaX) > Math.abs(event.deltaY) || hasLocalScroll(event.target, el)) return;
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      const direction = wheel.push(pixels, performance.now());
      if (direction) step(direction);
    };
    const touchStart = (event: TouchEvent) => {
      const start = event.touches[0];
      touch = event.touches.length === 1 && start && !dialog.current?.open && !hasLocalScroll(event.target, el)
        ? { x: start.clientX, y: start.clientY, handled: false }
        : null;
    };
    const touchMove = (event: TouchEvent) => {
      const point = event.touches[0];
      if (!touch || !point || event.touches.length !== 1) { touch = null; return; }
      const dy = touch.y - point.clientY;
      if (Math.abs(dy) < 12 || Math.abs(dy) <= Math.abs(touch.x - point.clientX)) return;
      event.preventDefault();
      if (!touch.handled && Math.abs(dy) >= 44) {
        touch.handled = true;
        step(Math.sign(dy));
      }
    };
    const touchEnd = () => { touch = null; };
    const keyMove = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || dialog.current?.open || hasLocalScroll(event.target, el)) return;
      if (event.key === " " && event.target instanceof Element && event.target.closest("button, a, summary")) return;
      const next = event.key === "Home" ? 0 : event.key === "End" ? scenes.length - 1
        : ["ArrowDown", "PageDown", " "].includes(event.key) ? activeScene.current + (event.shiftKey ? -1 : 1)
        : ["ArrowUp", "PageUp"].includes(event.key) ? activeScene.current - 1 : null;
      if (next === null) return;
      event.preventDefault();
      if (!event.repeat) go(next);
    };
    const hashIndex = scenes.findIndex(
      (s) => `#${s.id}` === window.location.hash,
    );
    if (hashIndex >= 0) go(hashIndex, true);
    else go(initialYear === null ? 0 : 1, true);
    const hashChange = () => {
      const i = scenes.findIndex((s) => `#${s.id}` === window.location.hash);
      if (i >= 0) go(i);
    };
    el.addEventListener("wheel", wheelMove, { passive: false });
    el.addEventListener("touchstart", touchStart, { passive: true });
    el.addEventListener("touchmove", touchMove, { passive: false });
    el.addEventListener("touchend", touchEnd);
    el.addEventListener("touchcancel", touchEnd);
    window.addEventListener("keydown", keyMove);
    window.addEventListener("hashchange", hashChange);
    return () => {
      el.removeEventListener("wheel", wheelMove);
      el.removeEventListener("touchstart", touchStart);
      el.removeEventListener("touchmove", touchMove);
      el.removeEventListener("touchend", touchEnd);
      el.removeEventListener("touchcancel", touchEnd);
      window.removeEventListener("keydown", keyMove);
      window.removeEventListener("hashchange", hashChange);
    };
  }, [go, initialYear, scenes]);

  const saveYear = (next: number | null) => {
    setYear(next);
    const url = new URL(window.location.href);
    if (next === null) url.searchParams.delete("yil");
    else url.searchParams.set("yil", String(next));
    window.history.replaceState(window.history.state, "", url);
  };
  const pickYear = (value: string) => {
    const next = value ? Number(value) : null;
    saveYear(next);
    const match = data.groups.find(
      (g) => next !== null && next >= g.minYear && next <= g.maxYear,
    );
    setGroupId(
      match?.id ?? (next === null ? (data.groups[0]?.id ?? null) : null),
    );
  };
  const yearPicker = (id: string) => (
    <div className="pulse-year-field">
      <label htmlFor={id}>Çocuğunuzun doğum yılı</label>
      <div className="pulse-select-wrap">
        <select
          id={id}
          value={year ?? ""}
          onChange={(e) => pickYear(e.target.value)}
        >
          <option value="">Doğum yılını seçin</option>
          {initialYear !== null && !data.years.includes(initialYear) ? (
            <option value={initialYear}>{initialYear}</option>
          ) : null}
          {data.years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </div>
    </div>
  );
  const questions = [
    {
      q: "Hangi yaşlar için?",
      a: data.ageSpan
        ? `Gruplarımız bugün ${data.ageSpan} yaş aralığını kapsıyor. Program bölümünden doğum yılını seçerek çocuğunuzun grubunu görebilirsiniz.`
        : "Gruplar doğum yılına göre belirlenir. Uygun grubu öğrenmek için bizimle iletişime geçin.",
    },
    {
      q: "Kayıt nasıl tamamlanır?",
      a: "Online ön kaydı doldurun. Görevlimiz sizi arayıp sahada kayıt için bilgi verir. Kâğıt kayıt formu veli tarafından imzalanır; ardından ilk antrenman bilgisi paylaşılır.",
    },
    {
      q: "Aidat nasıl işliyor?",
      a: "Bir aidat, grubun sıradaki 8 antrenmanını kapsar. İptal edilen antrenman hakkınızdan düşmez. Güncel tutarı bize yazarak öğrenebilirsiniz; nakit veya havale ile ödenebilir.",
    },
    {
      q: "Forma ve ekipman gerekiyor mu?",
      a: "Forma, şort ve tozluk her öğrenci için gerekli; eşofman isteğe bağlı. Beden bilgisi kayıtta alınır. Antrenmana su ve krampon ya da halı saha ayakkabısı getirmeniz yeterli.",
    },
    {
      q: "İptal ve değişiklikleri nasıl öğrenirim?",
      a: "Antrenman iptalleri ve program değişiklikleri WhatsApp’tan ve veli panelinden duyurulur. İptal edilen antrenman hakkınızdan düşmez.",
    },
    {
      q: "Çocuğumun gelişimini takip edebilir miyim?",
      a: "Kayıtlı öğrencilerin velileri, veli panelinden devam durumunu, antrenman takvimini, gelişim bilgilerini ve aidat durumunu görebilir.",
    },
  ];

  return (
    <div className="pulse-home" ref={root}>
      <a
        href="#program"
        className="pulse-skip"
        onClick={(e) => {
          e.preventDefault();
          go(1, true);
          requestAnimationFrame(() =>
            document
              .getElementById("program-year")
              ?.focus({ preventScroll: true }),
          );
        }}
      >
        Grup ve programa geç
      </a>
      <div className="pulse-shell">
        <div className="pulse-viewport">
          <div className="pulse-frame" data-scene={active} data-section={scenes[active]?.id}>
            <div className="pulse-ambient" aria-hidden="true" />
            <header className="pulse-header">
              <nav className="pulse-nav" aria-label="Ana sayfa bölümleri">
                {scenes.map((s, i) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    aria-current={active === i ? "location" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      go(i);
                    }}
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
              <a
                href="#okul"
                className="pulse-brand"
                aria-label={`${BRAND_NAME}, ana sayfa`}
                onClick={(e) => {
                  e.preventDefault();
                  go(0);
                }}
              >
                <Image src="/home/crest.webp" alt="" width={36} height={36} />
                <span>
                  <strong>KÜTAHYA GALATASARAY</strong>
                  <small>Futbol Okulu</small>
                </span>
              </a>
              <Link href="/giris" className="pulse-login">
                Veli girişi <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </header>
            <main
              className="pulse-stage"
              aria-label={BRAND_NAME}
            >
              <div className="pulse-stage-title" aria-hidden="true">
                {scenes.map((s, i) => (
                  <span key={s.id} data-visible={active === i}>
                    {s.title}
                  </span>
                ))}
              </div>
              <FootballScene scene={scenes[active]?.visual ?? 0} />
              <section
                id="okul"
                className="pulse-layer"
                data-active={active === 0}
                aria-hidden={active !== 0}
                inert={active !== 0}
              >
                <h1 className="sr-only">{BRAND_NAME}</h1>
                <Panel side="left" label="Okulumuz">
                  <div className="pulse-panel-label">
                    <span className="pulse-icon">
                      <Shirt size={18} aria-hidden="true" />
                    </span>
                    Aynı renkler. Aynı tutku.
                  </div>
                  <h2>
                    Her şey bir <br />
                    ilk pasla başlar.
                  </h2>
                  <p>
                    Galatasaray renkleriyle, Kütahya’da. Futbolu seven çocuklar
                    için yaşına uygun gruplar, düzenli antrenman ve takım
                    arkadaşlığı.
                  </p>
                  <div className="pulse-card-end">
                    <span className="pulse-live-dot" />
                    {data.ageSpan
                      ? `${data.ageSpan} yaş için gruplar`
                      : "Doğum yılına göre gruplar"}
                  </div>
                </Panel>
                <Panel side="right" label="Grubunu bul">
                  <div className="pulse-panel-label">
                    <span className="pulse-icon">
                      <Users size={18} aria-hidden="true" />
                    </span>
                    Onun için bir yer var.
                  </div>
                  <h2>Grubunu bul.</h2>
                  {yearPicker("hero-year")}
                  <div className="pulse-group-result" aria-live="polite">
                    {pickedGroup ? (
                      <>
                        <strong>{pickedGroup.name}</strong>
                        <span>
                          {pickedGroup.minYear === pickedGroup.maxYear
                            ? pickedGroup.minYear
                            : `${pickedGroup.minYear}-${pickedGroup.maxYear}`}{" "}
                          doğumlular · {pickedGroup.ages} yaş
                        </span>
                      </>
                    ) : (
                      <p>
                        {year === null
                          ? "Yılını seçin; günlerini, saatini ve sahasını görün."
                          : "Bu yıl için uygun grubu birlikte bulalım. Bize yazın."}
                      </p>
                    )}
                  </div>
                  {year !== null && !pickedGroup ? (
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pulse-text-link"
                    >
                      WhatsApp’tan sorun{" "}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                  ) : (
                    <button className="pulse-text-link" onClick={() => go(1)}>
                      Antrenman programı{" "}
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  )}
                </Panel>
              </section>
              <section
                id="program"
                className="pulse-layer"
                data-active={active === 1}
                aria-hidden={active !== 1}
                inert={active !== 1}
              >
                <h2 className="sr-only">Antrenman programı</h2>
                <Panel side="left" label="Yaş grubu">
                  <div className="pulse-panel-label">
                    <span className="pulse-icon">
                      <Users size={18} aria-hidden="true" />
                    </span>
                    Birlikte oynayacağı takım.
                  </div>
                  {yearPicker("program-year")}
                  {data.groups.length ? (
                    <div className="pulse-year-field">
                      <label htmlFor="program-group">Ya da gruptan bakın</label>
                      <div className="pulse-select-wrap">
                        <select
                          id="program-group"
                          value={groupId ?? ""}
                          onChange={(e) => {
                            setGroupId(Number(e.target.value));
                            saveYear(null);
                          }}
                        >
                          <option value="" disabled>
                            Grup seçin
                          </option>
                          {data.groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name} ·{" "}
                              {g.minYear === g.maxYear
                                ? g.minYear
                                : `${g.minYear}-${g.maxYear}`}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} aria-hidden="true" />
                      </div>
                    </div>
                  ) : (
                    <p>Gruplar hakkında bilgi almak için bize yazın.</p>
                  )}
                  {group?.next ? (
                    <div className="pulse-next">
                      <CalendarDays size={17} aria-hidden="true" />
                      <span>
                        Sıradaki antrenman
                        <strong>
                          {shortDate(group.next.date)} · {group.next.start}
                        </strong>
                      </span>
                    </div>
                  ) : null}
                  {year !== null && !pickedGroup ? (
                    <p role="status">
                      Bu yıl için henüz grup yok. Uygun grubu öğrenmek için{" "}
                      <a
                        className="pulse-inline-link"
                        href={WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        bize yazın.
                      </a>
                    </p>
                  ) : null}
                </Panel>
                <Panel side="right" label="Günler ve saatler">
                  <div className="pulse-panel-label">
                    <span className="pulse-icon">
                      <CalendarDays size={18} aria-hidden="true" />
                    </span>
                    Günler belli. Saha hazır.
                  </div>
                  <h3>{group ? group.name : "Antrenman günleri"}</h3>
                  {group ? (
                    <p className="pulse-group-age">
                      {group.minYear === group.maxYear
                        ? group.minYear
                        : `${group.minYear}-${group.maxYear}`}{" "}
                      doğumlular · {group.ages} yaş
                    </p>
                  ) : null}
                  <Schedule whatsapp={WHATSAPP_URL} group={group} venues={data.venues} />
                </Panel>
              </section>
              {hasCoaches ? (
                <section id="hocalar" className="pulse-layer pulse-layer--coaches" data-active={scenes[active]?.id === "hocalar"} aria-hidden={scenes[active]?.id !== "hocalar"} inert={scenes[active]?.id !== "hocalar"}>
                  <h2 className="sr-only">Hocalarımız</h2>
                  <CoachShowcase coaches={coaches} active={scenes[active]?.id === "hocalar"}/>
                </section>
              ) : null}
              <section
                id="kayit"
                className="pulse-layer"
                data-active={scenes[active]?.id === "kayit"}
                aria-hidden={scenes[active]?.id !== "kayit"}
                inert={scenes[active]?.id !== "kayit"}
              >
                <h2 className="sr-only">Kayıt ve okul hayatı</h2>
                <Panel side="left" label="Kayıt adımları">
                  <div className="pulse-panel-label">
                    <span className="pulse-icon">
                      <ArrowUpRight size={18} aria-hidden="true" />
                    </span>
                    Başlamak kolay.
                  </div>
                  <h3>
                    İlk antrenmana <br />
                    giden yol.
                  </h3>
                  <ol className="pulse-steps">
                    <li>
                      <span>1</span>
                      <div>
                        <strong>Ön kaydı doldurun.</strong>
                        <p>Çocuğunuzun bilgilerini online paylaşın.</p>
                      </div>
                    </li>
                    <li>
                      <span>2</span>
                      <div>
                        <strong>Biz sizi arayalım.</strong>
                        <p>Grubunu ve sahada kayıt gününü konuşalım.</p>
                      </div>
                    </li>
                    <li>
                      <span>3</span>
                      <div>
                        <strong>Sahada buluşalım.</strong>
                        <p>Veli imzasıyla kayıt tamamlansın. İlk pası atsın.</p>
                      </div>
                    </li>
                  </ol>
                </Panel>
                <Panel side="right" label="Okul hayatı">
                  <div className="pulse-panel-label">
                    <span className="pulse-icon">
                      <Check size={18} aria-hidden="true" />
                    </span>
                    Saha dışında da yanınızda.
                  </div>
                  <h3>
                    Onun oyunu. <br />
                    Sizin takibiniz.
                  </h3>
                  <ul className="pulse-features">
                    <li>
                      <strong>QR’lı öğrenci kartı</strong>
                      <p>Her öğrenciye özel, kalıcı kart.</p>
                    </li>
                    <li>
                      <strong>Veli paneli</strong>
                      <p>Devam, gelişim ve aidat bilgisi telefonunuzda.</p>
                    </li>
                    <li>
                      <strong>Bir aidat, 8 antrenman</strong>
                      <p>İptal edilen antrenman hakkınızdan düşmez.</p>
                    </li>
                  </ul>
                  <button
                    className="pulse-text-link"
                    onClick={() => dialog.current?.showModal()}
                  >
                    Merak ettikleriniz{" "}
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </Panel>
              </section>
              <section
                id="iletisim"
                className="pulse-layer pulse-layer--contact"
                data-active={scenes[active]?.id === "iletisim"}
                aria-hidden={scenes[active]?.id !== "iletisim"}
                inert={scenes[active]?.id !== "iletisim"}
              >
                <h2 className="sr-only">Saha ve iletişim</h2>
                <Panel side="left" label="Bize ulaşın">
                  <div className="pulse-panel-label">
                    <span className="pulse-icon">
                      <MapPin size={18} aria-hidden="true" />
                    </span>
                    Sahada görüşelim.
                  </div>
                  {data.venues.length ? (
                    <div className="pulse-venues">
                      {data.venues.map((v) => (
                        <div key={v.id}>
                          <h3>{v.name}</h3>
                          {v.address ? <p>{v.address}</p> : null}
                          <VenueLinks venue={v} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Antrenman yerini öğrenmek için bize yazın.</p>
                  )}
                  <div className="pulse-contact-links">
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle size={17} aria-hidden="true" />
                      <span>
                        WhatsApp’tan yazın<small>{formatPhone(phone)}</small>
                      </span>
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                    <a href={telLink(phone)}>
                      <Phone size={17} aria-hidden="true" />
                      <span>
                        Telefonla arayın<small>{formatPhone(phone)}</small>
                      </span>
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                    <a
                      href={INSTAGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <InstagramIcon />
                      <span>
                        Instagram<small>{INSTAGRAM_HANDLE}</small>
                      </span>
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                  </div>
                </Panel>
                <Panel side="right" label="Sizi arayalım">
                  <div className="pulse-panel-label">
                    <span className="pulse-icon">
                      <Phone size={18} aria-hidden="true" />
                    </span>
                    Bir telefon kadar yakın.
                  </div>
                  <h3>Sizi arayalım.</h3>
                  <p>
                    Adınızı ve telefonunuzu bırakın. Kayıt ve program hakkında
                    konuşalım.
                  </p>
                  <div className="pulse-form">
                    <CallbackForm />
                  </div>
                </Panel>
              </section>
            </main>
            <footer className="pulse-footer">
              <div className="pulse-scroll-cue">
                <span className="pulse-progress">
                  {String(active + 1).padStart(2, "0")}
                  <span> / {String(scenes.length).padStart(2, "0")}</span>
                </span>
                <span>
                  {active < scenes.length - 1 ? "Keşfetmek için kaydırın" : "Sahada görüşelim"}
                </span>
                {active < scenes.length - 1 ? <ArrowDown size={14} aria-hidden="true" /> : null}
              </div>
              <div className="pulse-actions">
                <Link href={PUBLIC_FORM_PATH} className="pulse-primary">
                  Ön kayıt yap <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
                <button
                  className="pulse-secondary"
                  onClick={() =>
                    active === scenes.length - 1 ? dialog.current?.showModal() : go(active + 1)
                  }
                >
                  {active === scenes.length - 1
                    ? "Sık sorulanlar"
                    : active === 0
                      ? "Okulu keşfet"
                      : "Devam edin"}
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
              <nav className="pulse-dots" aria-label="Bölüm seçin">
                {scenes.map((s, i) => (
                  <button
                    key={s.id}
                    aria-label={`${s.label} bölümüne git`}
                    aria-current={active === i ? "step" : undefined}
                    onClick={() => go(i)}
                  >
                    <span />
                  </button>
                ))}
              </nav>
            </footer>
          </div>
        </div>
      </div>
      <dialog
        ref={dialog}
        className="pulse-dialog"
        aria-labelledby="pulse-faq-title"
      >
        <div className="pulse-dialog-header">
          <h2 id="pulse-faq-title">Merak ettikleriniz.</h2>
          <button
            aria-label="Soruları kapat"
            className="pulse-close"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <div className="pulse-dialog-content">
          {questions.map((q) => (
            <details key={q.q}>
              <summary>
                {q.q}
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <p>{q.a}</p>
            </details>
          ))}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="pulse-primary"
          >
            Bize sorun <MessageCircle size={16} aria-hidden="true" />
          </a>
          <div className="pulse-qr">
            <div
              role="img"
              aria-label="Ön kayıt formu QR kodu"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p>
              <strong>Telefondan devam edin.</strong>Kameranızla okutun, ön
              kayıt formunu açın.
            </p>
          </div>
        </div>
      </dialog>
      <span className="sr-only" role="status" aria-live="polite">
        {scenes[active]?.label} bölümü, {active + 1} / {scenes.length}.
      </span>
    </div>
  );
}

function Schedule({
  group,
  venues,
  whatsapp,
}: {
  group: HomeGroup | undefined;
  venues: HomeVenue[];
  whatsapp: string;
}) {
  if (!group?.slots.length)
    return (
      <p className="pulse-empty">
        {group
          ? "Bu grubun programı henüz paylaşılmadı."
          : "Uygun grubu birlikte bulalım."}{" "}
        <a
          className="pulse-inline-link"
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
        >
          Bize yazın.
        </a>
      </p>
    );
  return (
    <ul className="pulse-schedule">
      {group.slots.map((s, i) => {
        const venue = venues.find((v) => v.id === s.venueId);
        return (
          <li key={`${s.weekday}-${s.start}-${i}`}>
            <div className="pulse-schedule-day">
              <strong>{DAYS[s.weekday - 1] ?? "Antrenman"}</strong>
              <span>
                {s.start} - {s.end}
              </span>
            </div>
            {venue ? (
              <a
                href={venue.google}
                target="_blank"
                rel="noopener noreferrer"
                className="pulse-schedule-venue"
              >
                <MapPin size={13} aria-hidden="true" />
                {venue.name}
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            ) : (
              <p>Saha bilgisi okul tarafından paylaşılacak.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
function InstagramIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}
