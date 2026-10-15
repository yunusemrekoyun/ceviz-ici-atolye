import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatTime = (seconds) => {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const total = Math.floor(value);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  const hours = Math.floor(mins / 60);

  if (hours > 0) {
    const mm = String(mins % 60).padStart(2, "0");
    const ss = String(secs).padStart(2, "0");
    return `${hours}:${mm}:${ss}`;
  }

  return `${mins}:${String(secs).padStart(2, "0")}`;
};

export default function MacOSVideoPlayer({ src, poster, title = "Video" }) {
  const wrapperRef = useRef(null);
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const hideTimerRef = useRef(null);
  const lastInteractionRef = useRef(0);
  const isScrubbingRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);

  const progress = useMemo(() => {
    if (!duration) return 0;
    return clamp(currentTime / duration, 0, 1);
  }, [currentTime, duration]);

  const clearHideTimer = useCallback(() => {
    if (!hideTimerRef.current) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    const video = videoRef.current;
    if (!video || video.paused) return;
    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 1700);
  }, [clearHideTimer]);

  const revealControls = useCallback(() => {
    lastInteractionRef.current = Date.now();
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useGSAP(
    () => {
      const el = controlsRef.current;
      if (!el) return;

      gsap.to(el, {
        opacity: controlsVisible ? 1 : 0,
        y: controlsVisible ? 0 : 10,
        duration: 0.18,
        ease: "power2.out",
        overwrite: "auto",
      });

      el.style.pointerEvents = controlsVisible ? "auto" : "none";
    },
    { dependencies: [controlsVisible] }
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const handleLoaded = () => {
      setIsReady(true);
      setDuration(Number(video.duration || 0));
      setCurrentTime(Number(video.currentTime || 0));
    };

    const handleTime = () => {
      if (isScrubbingRef.current) return;
      setCurrentTime(Number(video.currentTime || 0));
    };

    const handlePlay = () => {
      setIsPlaying(true);
      scheduleHide();
    };

    const handlePause = () => {
      setIsPlaying(false);
      setControlsVisible(true);
      clearHideTimer();
    };

    const handleVolume = () => {
      setMuted(Boolean(video.muted));
      setVolume(Number(video.volume ?? 1));
    };

    video.addEventListener("loadedmetadata", handleLoaded);
    video.addEventListener("timeupdate", handleTime);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolume);

    handleLoaded();
    handleVolume();

    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("timeupdate", handleTime);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolume);
      clearHideTimer();
    };
  }, [clearHideTimer, scheduleHide]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    revealControls();

    try {
      if (video.paused) await video.play();
      else video.pause();
    } catch {
      // ignore
    }
  };

  const handleWrapperPointerMove = () => {
    if (!isReady) return;
    revealControls();
  };

  const handleSeekStart = () => {
    isScrubbingRef.current = true;
    revealControls();
  };

  const handleSeekEnd = () => {
    isScrubbingRef.current = false;
    scheduleHide();
  };

  const handleSeek = (event) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Number(event.target.value || 0);
    video.currentTime = next;
    setCurrentTime(next);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    revealControls();

    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const handleVolumeChange = (event) => {
    const video = videoRef.current;
    if (!video) return;
    const next = clamp(Number(event.target.value || 0), 0, 1);
    video.volume = next;
    video.muted = next === 0;
    setVolume(next);
    setMuted(video.muted);
    revealControls();
  };

  const enterFullscreen = async () => {
    revealControls();
    const target = wrapperRef.current;
    if (!target) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (target.requestFullscreen) {
        await target.requestFullscreen();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="mac-video-player"
      onPointerMove={handleWrapperPointerMove}
      onPointerDown={revealControls}
      role="group"
      aria-label={title}
    >
      <video
        ref={videoRef}
        className="mac-video"
        src={src}
        poster={poster || undefined}
        preload="metadata"
        playsInline
        onClick={togglePlay}
      />

      {!isPlaying ? (
        <button
          type="button"
          className="mac-video-bigplay"
          onClick={togglePlay}
          aria-label="Play"
        >
          <Play size={28} aria-hidden />
        </button>
      ) : null}

      <div
        ref={controlsRef}
        className={clsx("mac-video-controls", controlsVisible && "is-visible")}
      >
        <button
          type="button"
          className="mac-video-btn"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
        </button>

        <div className="mac-video-time" aria-label="Playback time">
          <span>{formatTime(currentTime)}</span>
          <span className="mac-video-time-sep">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="mac-video-scrub" aria-label="Seek">
          <div className="mac-video-scrub-track" aria-hidden>
            <span className="mac-video-scrub-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, duration)}
            step={0.05}
            value={Math.min(currentTime, duration || 0)}
            onPointerDown={handleSeekStart}
            onPointerUp={handleSeekEnd}
            onPointerCancel={handleSeekEnd}
            onChange={handleSeek}
            aria-label="Seek"
          />
        </div>

        <button
          type="button"
          className="mac-video-btn"
          onClick={toggleMute}
          aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
        >
          {muted || volume === 0 ? (
            <VolumeX size={16} aria-hidden />
          ) : (
            <Volume2 size={16} aria-hidden />
          )}
        </button>

        <input
          className="mac-video-volume"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onPointerDown={revealControls}
          onChange={handleVolumeChange}
          aria-label="Volume"
        />

        <button
          type="button"
          className="mac-video-btn"
          onClick={enterFullscreen}
          aria-label="Fullscreen"
        >
          <Maximize2 size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
