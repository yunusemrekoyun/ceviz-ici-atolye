import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { fetchServicesFullCached } from "../../utils/servicesCache";
import useViewportActivation from "../../hooks/useViewportActivation";
import { usePerformanceProfile } from "../../performance/PerformanceProvider";
import { useLocale } from "../../i18n/LocaleContext.jsx";
import { localizePath } from "../../i18n/routing.js";

const PANEL_WIDTH = 300;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const HeroServiceRibbon = () => {
  const { locale } = useLocale();
  const [services, setServices] = useState([]);
  const [activePanel, setActivePanel] = useState(null);
  const [viewportRef, inView] = useViewportActivation({
    once: false,
    rootMargin: "120px 0px",
  });
  const { allowMarquee, isTouch } = usePerformanceProfile();

  const containerRef = useRef(null);
  const chipRefs = useRef({});
  const closeTimerRef = useRef(null);

  const copy =
    locale === "en"
      ? {
          loadError: "Hero service ribbon could not be loaded:",
          subServices: "Sub-services",
        }
      : {
          loadError: "Hero hizmet şeridi yüklenemedi:",
          subServices: "Alt Hizmetler",
        };

  useEffect(() => {
    let mounted = true;

    fetchServicesFullCached({ locale })
      .then((list) => {
        if (!mounted) return;
        setServices(Array.isArray(list) ? list : []);
      })
      .catch((error) => {
        console.error(copy.loadError, error);
      });

    return () => {
      mounted = false;
    };
  }, [copy.loadError, locale]);

  useEffect(() => {
    const clearTimer = () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };

    const handleResize = () => {
      clearTimer();
      setActivePanel(null);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimer();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const track = useMemo(
    () => [...services, ...services, ...services],
    [services]
  );

  const clearCloseTimer = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const delayedClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setActivePanel(null), 180);
  };

  const openPanel = (service, key) => {
    clearCloseTimer();

    if (isTouch || !Array.isArray(service?.subServices) || !service.subServices.length) {
      setActivePanel(null);
      return;
    }

    const container = containerRef.current;
    const anchor = chipRefs.current[key];

    if (!container || !anchor) {
      setActivePanel({ service, left: 12, arrowOffset: 40 });
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const rawLeft = anchorRect.left - containerRect.left;
    const left = clamp(rawLeft, 12, containerRect.width - PANEL_WIDTH - 12);
    const arrowOffset = clamp(
      anchorRect.left -
        containerRect.left -
        left +
        anchorRect.width / 2,
      28,
      PANEL_WIDTH - 28
    );

    setActivePanel({ service, left, arrowOffset });
  };

  if (!services.length) return null;

  const pauseMarquee = Boolean(activePanel) || !allowMarquee || !inView;

  return (
    <div
      ref={viewportRef}
      className="relative z-40 mx-auto w-full max-w-[1040px]"
      onMouseEnter={clearCloseTimer}
      onMouseLeave={delayedClose}
    >
      <div ref={containerRef} className="relative">
        <div
          className="overflow-hidden rounded-full border border-white/16 bg-gradient-to-b from-white/12 to-white/7 px-2 py-2 shadow-[0_18px_48px_-38px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:px-3"
          style={{
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%)",
            maskImage:
              "linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%)",
          }}
        >
          <div
            className={`flex w-max whitespace-nowrap animate-brand-marquee ${
              pauseMarquee ? "motion-paused" : ""
            }`}
            style={{ "--brand-marquee-duration": "36s" }}
          >
            {track.map((service, index) => {
              const key = `${service?._id || service?.title || "service"}-${index}`;
              const hasSubServices =
                Array.isArray(service?.subServices) &&
                service.subServices.length > 0;
              const isActive =
                activePanel?.service?._id === service?._id && hasSubServices;

              return (
                <div
                  key={key}
                  ref={(node) => {
                    if (node) chipRefs.current[key] = node;
                    else delete chipRefs.current[key];
                  }}
                  className="mx-1.5 shrink-0"
                  onMouseEnter={() => openPanel(service, key)}
                >
                  <Link
                    to={
                      service?._id
                        ? localizePath(`/services/${service._id}`, locale)
                        : localizePath("/services", locale)
                    }
                    state={service?._id ? { title: service?.title || "", service } : undefined}
                    className={`inline-flex min-h-[52px] min-w-[158px] max-w-[186px] items-center justify-center rounded-full border px-4 py-2 text-center text-[11px] font-semibold leading-[1.05rem] text-white transition sm:min-h-[54px] sm:min-w-[172px] sm:max-w-[198px] sm:text-[12px] ${
                      isActive
                        ? "border-white/34 bg-white/24 shadow-[0_18px_34px_-28px_rgba(255,255,255,0.52)]"
                        : ""
                    } ${
                      hasSubServices
                        ? "border-white/18 bg-white/10 hover:border-white/28 hover:bg-white/16"
                        : "border-white/14 bg-white/[0.08] hover:border-white/22 hover:bg-white/13"
                    }`}
                  >
                    <span className="line-clamp-2 whitespace-normal">
                      {service.title}
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {activePanel && !isTouch && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 0.68, 0.4, 0.92] }}
              className="absolute top-full z-[70] mt-3 hidden w-[300px] md:block"
              style={{ left: activePanel.left }}
              onMouseEnter={clearCloseTimer}
              onMouseLeave={delayedClose}
            >
              <div className="relative rounded-[28px] border border-white/72 bg-white/93 p-3 text-slate-900 shadow-[0_28px_70px_-34px_rgba(15,23,42,0.48)] backdrop-blur-2xl">
                <div
                  className="absolute top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-white/72 bg-white/93"
                  style={{ left: activePanel.arrowOffset }}
                />
                <div className="px-2 pt-1">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {activePanel.service.title}
                  </div>
                  <div className="mt-1 text-base font-semibold text-slate-800">
                    {copy.subServices}
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {activePanel.service.subServices.map((subService, index) => (
                    <Link
                      key={subService?._id || `${activePanel.service._id}-${index}`}
                      to={
                        activePanel.service?._id && (subService?._id || subService?.id)
                          ? localizePath(
                              `/services/${activePanel.service._id}/sub-services/${subService?._id || subService?.id}`,
                              locale
                            )
                          : localizePath("/services", locale)
                      }
                      state={
                        activePanel.service?._id
                          ? {
                              parentTitle: activePanel.service?.title || "",
                              parentService: activePanel.service,
                              subServiceTitle: subService?.title || "",
                            }
                          : undefined
                      }
                      className="block rounded-2xl border border-transparent px-3 py-2.5 text-sm font-medium leading-5 text-slate-700 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
                    >
                      {subService.title}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HeroServiceRibbon;
