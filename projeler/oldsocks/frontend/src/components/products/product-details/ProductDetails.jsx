import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { getResponsiveImageProps } from "../../../utils/media";

// Ürün galerisi. Mobilde header'ın altındaki ekranı dolduran, köşeleri yuvarlak ve parmakla
// kaydırılan görseller (altta detay kartının üst kısmı görünür); masaüstünde tek görsel
// ekran yüksekliğinde bütünüyle, birden çok görsel iki sütunlu ızgarada. Görsele
// tıklayınca tam ekran görüntüleyici açılır.
const SLIDE_IMAGE = { widths: [480, 640, 960, 1200], defaultWidth: 960, sizes: "100vw" };
const GRID_IMAGE = { widths: [480, 640, 960], defaultWidth: 640, sizes: "(min-width: 1280px) 330px, 28vw" };
const SINGLE_IMAGE = { widths: [640, 960, 1200], defaultWidth: 960, sizes: "(min-width: 1024px) 50vw, 100vw" };
const FULL_IMAGE = { widths: [960, 1200], defaultWidth: 1200, sizes: "100vw" };

function Img({ image, preset, className, eager, alt }) {
  const props = getResponsiveImageProps(image, preset);
  return (
    <img
      src={props.src}
      srcSet={props.srcSet}
      sizes={props.sizes}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchpriority={eager ? "high" : undefined}
      decoding="async"
      className={className}
    />
  );
}

function Viewer({ gallery, start, name, onClose }) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(start);

  const go = useCallback((next) => {
    const el = trackRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(gallery.length - 1, next));
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  }, [gallery.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollLeft = start * el.clientWidth;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [start]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(index + 1);
      if (event.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, onClose]);

  return (
    <div className="fixed inset-0 z-[1100] bg-black/95" role="dialog" aria-modal="true" aria-label={`${name} görselleri`}>
      <div
        ref={trackRef}
        onScroll={(event) => setIndex(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}
        className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto"
      >
        {gallery.map((image, i) => (
          <div key={i} className="flex h-full w-full shrink-0 snap-center items-center justify-center p-2 sm:p-8">
            <Img image={image} preset={FULL_IMAGE} alt={`${name} görsel ${i + 1}`} className="max-h-full max-w-full object-contain" />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Kapat"
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
      >
        <FaTimes />
      </button>
      {gallery.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Önceki görsel"
            className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-30 sm:flex"
          >
            <FaChevronLeft />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === gallery.length - 1}
            aria-label="Sonraki görsel"
            className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-30 sm:flex"
          >
            <FaChevronRight />
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
            {index + 1} / {gallery.length}
          </p>
        </>
      )}
    </div>
  );
}

export default function ProductDetails({ product }) {
  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState(null);
  const trackRef = useRef(null);

  useEffect(() => {
    setActive(0);
    setViewer(null);
    if (trackRef.current) trackRef.current.scrollLeft = 0;
  }, [product?._id]);

  if (!product) return null;

  // Medya kayıtları varsa farklı boyutlar (srcset) kullanılır; yoksa eski tek adres.
  const gallery = product.media?.images?.length ? product.media.images : product.images || [];
  if (!gallery.length) {
    return <div className="flex aspect-[3/4] items-center justify-center rounded-2xl bg-light1 text-sm text-dark2">Görsel yok</div>;
  }

  const goTo = (i) => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      {/* Mobil ve tablet: kaydırmalı galeri. Yükseklik = ekran - header - detay kartının görünen kısmı */}
      <div className="relative -mx-2 overflow-hidden rounded-[1.75rem] bg-light1 sm:mx-0 lg:hidden">
        <div
          ref={trackRef}
          onScroll={(event) => setActive(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}
          className="no-scrollbar flex h-[calc(100vh-10.5rem)] min-h-[22rem] snap-x snap-mandatory overflow-x-auto supports-[height:100svh]:h-[calc(100svh-10.5rem)]"
        >
          {gallery.map((image, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setViewer(i)}
              aria-label={`${product.name} görsel ${i + 1}, büyüt`}
              className="h-full w-full shrink-0 snap-center bg-light1"
            >
              <Img image={image} preset={SLIDE_IMAGE} eager={i === 0} alt={`${product.name} görsel ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        {gallery.length > 1 && (
          <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/25 px-2.5 py-1.5 backdrop-blur">
            {gallery.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Görsel ${i + 1}`}
                aria-current={active === i}
                className={`h-1.5 rounded-full transition-all ${active === i ? "w-5 bg-white" : "w-1.5 bg-white/60"}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Masaüstü */}
      <div className="hidden lg:block">
        {gallery.length === 1 ? (
          <button
            type="button"
            onClick={() => setViewer(0)}
            aria-label={`${product.name} görselini büyüt`}
            className="flex w-full cursor-zoom-in justify-center overflow-hidden rounded-2xl bg-light1"
          >
            <Img
              image={gallery[0]}
              preset={SINGLE_IMAGE}
              eager
              alt={product.name}
              className="h-[min(calc(100vh-8rem),58rem)] w-auto max-w-full object-contain"
            />
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {gallery.map((image, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setViewer(i)}
                aria-label={`${product.name} görsel ${i + 1}, büyüt`}
                className="group aspect-[3/4] cursor-zoom-in overflow-hidden rounded-xl bg-light1"
              >
                <Img
                  image={image}
                  preset={GRID_IMAGE}
                  eager={i < 2}
                  alt={`${product.name} görsel ${i + 1}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sayfa köküne çizilir: telefonda galeri sabitlenip ölçeklendiği için kendi katmanında
          kalırsa detay kartı ve header görüntüleyicinin üstüne çıkar. */}
      {viewer !== null &&
        createPortal(
          <Viewer gallery={gallery} start={viewer} name={product.name} onClose={() => setViewer(null)} />,
          document.body
        )}
    </div>
  );
}
