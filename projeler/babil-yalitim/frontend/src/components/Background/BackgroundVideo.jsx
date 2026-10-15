// src/components/Background/BackgroundVideo.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  getMediaUrl,
  getOptimizedImageUrl,
  getOptimizedVideoUrl,
} from "../../utils/media";
import { usePerformanceProfile } from "../../performance/PerformanceProvider";

export default function BackgroundVideo({
  active = true,
  desktopVideoUrl = "",
  mobileImageUrl = "",
  mobileVideoUrl = "",
  posterUrl = "",
  fallbackSrc = "/fallback-hero.jpg",
  className = "",
}) {
  const videoRef = useRef(null);
  const resumeTimersRef = useRef([]);
  const didBecomeHiddenRef = useRef(false);
  const {
    backgroundVideoWidth,
    mobileBackgroundVideoWidth,
    imageQuality,
    isMobile,
  } = usePerformanceProfile();
  const [ready, setReady] = useState(false);
  // Hero videosu birkaç MB ve API ile aynı HTTP/2 bağlantısını paylaşıyor.
  // Hemen indirmeye başlarsa /api yanıtları ve kart medyaları onun arkasında
  // kuyruğa giriyor; sayfa içeriği saniyelerce boş kalıyor. Poster zaten
  // anında geldiği için görsel bir kayıp olmadan indirmeyi erteliyoruz.
  const [videoStarted, setVideoStarted] = useState(false);

  const chosenVideoUrl = isMobile ? mobileVideoUrl || desktopVideoUrl : desktopVideoUrl;
  const shouldUseVideo = Boolean(chosenVideoUrl);
  const priorityProps = { fetchpriority: "high" };

  const videoUrl = useMemo(
    () => getOptimizedVideoUrl(chosenVideoUrl),
    [chosenVideoUrl]
  );

  // Masaüstü videosu 16:9; laptop ekranları tarayıcı çubuğuyla birlikte daha
  // geniş kaldığı için üstten ve alttan kırpılıyor. Uygulanan zemin karenin
  // altında olduğundan kırpmayı tamamen üste (duvar/gökyüzü) veriyoruz.
  // Poster de aynı hizada olmalı, yoksa video açılınca görüntü zıplar.
  const framingClass = isMobile ? "object-center" : "object-bottom";

  const fallbackImageUrl = useMemo(() => {
    const imageUrl = (isMobile && mobileImageUrl) || posterUrl || "";
    if (!imageUrl) return fallbackSrc;

    return getOptimizedImageUrl(imageUrl, {
      width: isMobile ? mobileBackgroundVideoWidth : backgroundVideoWidth,
      quality: imageQuality,
      fallbackSrc,
    });
  }, [
    backgroundVideoWidth,
    fallbackSrc,
    imageQuality,
    isMobile,
    mobileBackgroundVideoWidth,
    mobileImageUrl,
    posterUrl,
  ]);

  // Masaüstü ve mobil videolarının en-boy oranları farklı olduğu için
  // poster de cihaza göre seçilmeli; aksi halde video yüklenince görüntü zıplıyor.
  const placeholderUrl =
    getMediaUrl((isMobile && mobileImageUrl) || posterUrl) ||
    fallbackImageUrl ||
    fallbackSrc;

  useEffect(() => {
    setReady(false);
  }, [isMobile, shouldUseVideo, videoUrl]);

  useEffect(() => {
    if (!shouldUseVideo || !videoUrl) return undefined;

    let cancelled = false;
    let idleId = 0;
    let floorTimerId = 0;
    let fallbackTimerId = 0;
    const start = () => {
      if (!cancelled) setVideoStarted(true);
    };

    // Yalnızca requestIdleCallback yetmiyor: React mount olur olmaz tarayıcı
    // "boştayım" diyor ve video, sayfanın kendi API çağrıları başlamadan önce
    // indirilmeye başlıyor. Bu yüzden önce sabit bir alt sınır bekliyoruz,
    // ardından tarayıcının gerçekten boşa çıkmasını.
    floorTimerId = window.setTimeout(() => {
      if (cancelled) return;
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(start, { timeout: 3000 });
      } else {
        fallbackTimerId = window.setTimeout(start, 300);
      }
    }, 2000);

    return () => {
      cancelled = true;
      if (idleId) window.cancelIdleCallback?.(idleId);
      if (floorTimerId) window.clearTimeout(floorTimerId);
      if (fallbackTimerId) window.clearTimeout(fallbackTimerId);
    };
  }, [shouldUseVideo, videoUrl]);

  useEffect(() => {
    if (!shouldUseVideo || !videoUrl || !videoStarted) return undefined;

    const video = videoRef.current;
    if (!video) return undefined;
    let frameCallbackId = null;

    const clearResumeTimers = () => {
      if (!resumeTimersRef.current.length) return;
      resumeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      resumeTimersRef.current = [];
    };

    const markReady = () => {
      window.requestAnimationFrame(() => setReady(true));
    };

    const bindFrameReady = () => {
      if (typeof video.requestVideoFrameCallback !== "function") return;
      frameCallbackId = video.requestVideoFrameCallback(() => {
        markReady();
      });
    };

    const attemptPlayback = () => {
      if (!active || document.hidden) return;
      video.play().catch(() => {});
    };

    const scheduleResume = () => {
      clearResumeTimers();
      [0, 180, 520].forEach((delay) => {
        const timer = window.setTimeout(() => {
          attemptPlayback();
        }, delay);
        resumeTimersRef.current.push(timer);
      });
    };

    const syncPlayback = () => {
      if (!active || document.hidden) {
        didBecomeHiddenRef.current = true;
        clearResumeTimers();
        video.pause();
        return;
      }

      if (didBecomeHiddenRef.current || video.paused) {
        didBecomeHiddenRef.current = false;
        scheduleResume();
      }
    };

    const handleResumeSignal = () => {
      if (!active || document.hidden || !video.paused) return;
      scheduleResume();
    };

    const handlePlaybackIssue = () => {
      if (!active || document.hidden) return;
      scheduleResume();
    };

    const handleUnexpectedPause = () => {
      if (!active || document.hidden || didBecomeHiddenRef.current) return;
      scheduleResume();
    };

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = isMobile ? "metadata" : "auto";
    video.poster = placeholderUrl || "";
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    bindFrameReady();
    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);
    video.addEventListener("canplaythrough", markReady);
    video.addEventListener("playing", markReady);
    video.addEventListener("timeupdate", markReady, { once: true });
    video.addEventListener("waiting", handlePlaybackIssue);
    video.addEventListener("stalled", handlePlaybackIssue);
    video.addEventListener("suspend", handlePlaybackIssue);
    video.addEventListener("pause", handleUnexpectedPause);

    document.addEventListener("visibilitychange", syncPlayback);
    window.addEventListener("focus", handleResumeSignal);
    window.addEventListener("pageshow", handleResumeSignal);
    if (active) {
      attemptPlayback();
    } else {
      video.pause();
    }

    return () => {
      clearResumeTimers();
      didBecomeHiddenRef.current = false;
      if (
        frameCallbackId !== null &&
        typeof video.cancelVideoFrameCallback === "function"
      ) {
        video.cancelVideoFrameCallback(frameCallbackId);
      }
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("canplay", markReady);
      video.removeEventListener("canplaythrough", markReady);
      video.removeEventListener("playing", markReady);
      video.removeEventListener("timeupdate", markReady);
      video.removeEventListener("waiting", handlePlaybackIssue);
      video.removeEventListener("stalled", handlePlaybackIssue);
      video.removeEventListener("suspend", handlePlaybackIssue);
      video.removeEventListener("pause", handleUnexpectedPause);
      document.removeEventListener("visibilitychange", syncPlayback);
      window.removeEventListener("focus", handleResumeSignal);
      window.removeEventListener("pageshow", handleResumeSignal);
    };
  }, [active, isMobile, placeholderUrl, shouldUseVideo, videoUrl, videoStarted]);

  return (
    <div
      className={`fixed inset-0 h-full w-full -z-10 overflow-hidden bg-slate-950 transition-opacity duration-300 ${
        active ? "opacity-100" : "opacity-0"
      } ${className}`}
      data-ambient-video={
        shouldUseVideo ? (isMobile ? "mobile" : "desktop") : "poster"
      }
    >
      {!shouldUseVideo || !videoUrl ? (
        <img
          src={placeholderUrl}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover bg-slate-950 ${framingClass}`}
          loading="eager"
          decoding="async"
          {...priorityProps}
        />
      ) : (
        <>
          <img
            src={placeholderUrl}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover bg-slate-950 transition-opacity duration-500 ${framingClass} ${
              ready ? "opacity-0" : "opacity-100"
            }`}
            loading="eager"
            decoding="async"
            {...priorityProps}
          />
          <video
            ref={videoRef}
            src={videoStarted ? videoUrl : undefined}
            className={`absolute inset-0 h-full w-full object-cover bg-slate-950 transition-opacity duration-500 ${framingClass} ${
              ready ? "opacity-100" : "opacity-0"
            }`}
            autoPlay
            loop
            muted
            playsInline
            preload={isMobile ? "metadata" : "auto"}
            poster={placeholderUrl || undefined}
          />
        </>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/10 via-transparent to-slate-950/20" />
    </div>
  );
}

BackgroundVideo.propTypes = {
  active: PropTypes.bool,
  desktopVideoUrl: PropTypes.string,
  mobileImageUrl: PropTypes.string,
  mobileVideoUrl: PropTypes.string,
  posterUrl: PropTypes.string,
  fallbackSrc: PropTypes.string,
  className: PropTypes.string,
};
