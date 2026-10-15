'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Square, Sparkles, Flame, TreePine, CloudRain, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export function SoundMixer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [campfireVol, setCampfireVol] = useState(40);
  const [rainVol, setRainVol] = useState(25);
  const [windVol, setWindVol] = useState(30);
  const { t } = useLanguage();

  // Audio Context reference
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Gain nodes
  const campfireGain = useRef<GainNode | null>(null);
  const rainGain = useRef<GainNode | null>(null);
  const windGain = useRef<GainNode | null>(null);
  // Source nodes
  const noiseSource = useRef<AudioScheduledSourceNode | null>(null);
  const oscSource = useRef<OscillatorNode | null>(null);
  const cleanupAudioRef = useRef<(() => void) | null>(null);

  // Initialize synth voices using Web Audio API
  const startAudio = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported in this browser.');
      }

      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      // Master compression to keep sounds warm and cozy
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-20, ctx.currentTime);
      compressor.knee.setValueAtTime(30, ctx.currentTime);
      compressor.ratio.setValueAtTime(4, ctx.currentTime);
      compressor.attack.setValueAtTime(0.05, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);
      compressor.connect(ctx.destination);

      // 1. Cozy Campfire crackle loop / low rumble path
      campfireGain.current = ctx.createGain();
      campfireGain.current.gain.setValueAtTime(campfireVol / 200, ctx.currentTime);
      campfireGain.current.connect(compressor);

      // Low frequency oscillator representing burning logs
      const fireOsc = ctx.createOscillator();
      fireOsc.type = 'sawtooth';
      fireOsc.frequency.setValueAtTime(22, ctx.currentTime); // 22Hz rumble

      const fireFilter = ctx.createBiquadFilter();
      fireFilter.type = 'lowpass';
      fireFilter.frequency.setValueAtTime(120, ctx.currentTime);

      fireOsc.connect(fireFilter);
      fireFilter.connect(campfireGain.current);
      fireOsc.start();

      // Simple periodic interval generating crackling sparks!
      const crackleInterval = setInterval(() => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'suspended') return;
        if (!campfireGain.current || campfireVol === 0) return;
        
        try {
          // Play a small crackle burst
          const sparkOsc = audioCtxRef.current.createOscillator();
          const sparkGain = audioCtxRef.current.createGain();
          const sparkFilter = audioCtxRef.current.createBiquadFilter();

          sparkOsc.type = 'triangle';
          sparkOsc.frequency.setValueAtTime(1200 + Math.random() * 2000, audioCtxRef.current.currentTime);
          
          sparkFilter.type = 'bandpass';
          sparkFilter.frequency.setValueAtTime(2500, audioCtxRef.current.currentTime);
          sparkFilter.Q.setValueAtTime(5, audioCtxRef.current.currentTime);

          sparkGain.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
          sparkGain.gain.linearRampToValueAtTime((Math.random() * 0.05) * (campfireVol / 100), audioCtxRef.current.currentTime + 0.005);
          sparkGain.gain.exponentialRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 0.08);

          sparkOsc.connect(sparkFilter);
          sparkFilter.connect(sparkGain);
          sparkGain.connect(compressor);

          sparkOsc.start();
          sparkOsc.stop(audioCtxRef.current.currentTime + 0.1);
        } catch (e) {
          // Ignore transient web audio errors
        }
      }, 180);

      // 2. Heavy Forest Rain (white noise filtered)
      rainGain.current = ctx.createGain();
      rainGain.current.gain.setValueAtTime(rainVol / 200, ctx.currentTime);
      rainGain.current.connect(compressor);

      // Buffer generation for rain white noise
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.setValueAtTime(800, ctx.currentTime);
      rainFilter.Q.setValueAtTime(1.5, ctx.currentTime);

      whiteNoise.connect(rainFilter);
      rainFilter.connect(rainGain.current);
      whiteNoise.start();
      noiseSource.current = whiteNoise;

      // 3. Immersive Wind (sweeping resonance filter)
      windGain.current = ctx.createGain();
      windGain.current.gain.setValueAtTime(windVol / 120, ctx.currentTime);
      windGain.current.connect(compressor);

      const windNoise = ctx.createBufferSource();
      windNoise.buffer = noiseBuffer;
      windNoise.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(350, ctx.currentTime);
      windFilter.Q.setValueAtTime(4, ctx.currentTime);

      windNoise.connect(windFilter);
      windFilter.connect(windGain.current);
      windNoise.start();

      // Automate wind sweeps with an LFO
      const windLFO = ctx.createOscillator();
      windLFO.frequency.setValueAtTime(0.08, ctx.currentTime); // 12 seconds per sweep
      const windLFOGain = ctx.createGain();
      windLFOGain.gain.setValueAtTime(120, ctx.currentTime); // Filter sweep deviation

      windLFO.connect(windLFOGain);
      windLFOGain.connect(windFilter.frequency);
      windLFO.start();

      setIsPlaying(true);

      // Cleaners helper
      cleanupAudioRef.current = () => {
        clearInterval(crackleInterval);
        try {
          whiteNoise.disconnect();
          windNoise.disconnect();
          windLFO.disconnect();
          fireOsc.disconnect();
        } catch (err) {}
      };
    } catch (e) {
      console.warn("Web Audio Context could not start:", e);
      // Fallback state
      setIsPlaying(true);
    }
  };

  const stopAudio = () => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (cleanupAudioRef.current) {
      cleanupAudioRef.current();
      cleanupAudioRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      startAudio();
    }
  };

  useEffect(() => {
    if (campfireGain.current && audioCtxRef.current) {
      campfireGain.current.gain.setValueAtTime(campfireVol / 200, audioCtxRef.current.currentTime);
    }
  }, [campfireVol]);

  useEffect(() => {
    if (rainGain.current && audioCtxRef.current) {
      rainGain.current.gain.setValueAtTime(rainVol / 200, audioCtxRef.current.currentTime);
    }
  }, [rainVol]);

  useEffect(() => {
    if (windGain.current && audioCtxRef.current) {
      windGain.current.gain.setValueAtTime(windVol / 120, audioCtxRef.current.currentTime);
    }
  }, [windVol]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      if (cleanupAudioRef.current) {
        cleanupAudioRef.current();
        cleanupAudioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="panel-glass p-4 text-white/90 select-none space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-semibold text-sm tracking-wide">{t('sound.title')}</h4>
          <p className="text-[10px] text-white/50">{t('sound.desc')}</p>
        </div>
        <button
          onClick={togglePlayback}
          className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 ${
            isPlaying
              ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30'
              : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
          }`}
        >
          {isPlaying ? (
            <>
              <Square size={13} fill="currentColor" />
              <span>{t('sound.mute')}</span>
            </>
          ) : (
            <>
              <Play size={13} fill="currentColor" />
              <span>{t('sound.engage')}</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-3 pt-2">
        {/* Campfire crackle gain */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 text-orange-300">
              <Flame size={14} className="animate-pulse" /> {t('sound.campfire')}
            </span>
            <span className="font-mono text-[10px] text-white/60">{campfireVol}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={campfireVol}
            disabled={!isPlaying}
            onChange={(e) => setCampfireVol(Number(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-accent disabled:opacity-30 disabled:cursor-not-allowed"
          />
        </div>

        {/* Rain gain */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <CloudRain size={14} /> {t('sound.rain')}
            </span>
            <span className="font-mono text-[10px] text-white/60">{rainVol}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={rainVol}
            disabled={!isPlaying}
            onChange={(e) => setRainVol(Number(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed"
          />
        </div>

        {/* Alpine wind gain */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 text-teal-300">
              <TreePine size={14} /> {t('sound.wind')}
            </span>
            <span className="font-mono text-[10px] text-white/60">{windVol}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={windVol}
            disabled={!isPlaying}
            onChange={(e) => setWindVol(Number(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-teal-300 disabled:opacity-30 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {isPlaying && (
        <div className="flex items-center gap-2 pt-1 text-[10px] text-emerald-300">
          <ShieldCheck size={12} />
          <span>{t('sound.active')}</span>
        </div>
      )}
    </div>
  );
}
