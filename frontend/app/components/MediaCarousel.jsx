// frontend/app/components/MediaCarousel.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const isVideoUrl = (u = "") => /\.(mp4|webm|ogg)$/i.test(u);

// Encode filenames (spaces/accents)
const safeUrl = (src = "") => {
  if (!src) return src;
  if (/^https?:\/\//i.test(src)) return src;
  const s = src.startsWith("/") ? src : `/${src}`;
  return encodeURI(s);
};

/**
 * MediaCarousel
 * Props:
 *  - media: [{ url, type: 'image' | 'video', alt? }]
 *  - heightClass: tailwind class for fixed height (default h-[420px])
 *  - auto: boolean (default true)
 */
export default function MediaCarousel({ media = [], heightClass = "h-[420px]", auto = true }) {
  const slides = useMemo(() => {
    const arr = Array.isArray(media) ? media : [];
    return arr
      .filter((m) => m && m.url)
      .map((m) => {
        const url = safeUrl(m.url);
        const type = m.type || (isVideoUrl(url) ? "video" : "image");
        return { ...m, url, type };
      })
      .filter((m) => m.type === "image" || m.type === "video");
  }, [media]);

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  const go = useCallback(
    (i, markUser = false) => {
      if (!slides.length) return;
      const n = ((i % slides.length) + slides.length) % slides.length;
      setIdx(n);
      if (markUser) setUserInteracted(true);
    },
    [slides.length]
  );

  const prev = useCallback(() => go(idx - 1, true), [go, idx]);
  const next = useCallback(() => go(idx + 1, true), [go, idx]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  // Swipe
  const startX = useRef(0);
  const deltaX = useRef(0);
  const dragging = useRef(false);
  const getX = (e) => ("touches" in e ? e.touches?.[0]?.clientX ?? 0 : e.clientX ?? 0);

  const onDown = (e) => {
    dragging.current = true;
    startX.current = getX(e);
    deltaX.current = 0;
    setPaused(true);
  };
  const onMove = (e) => {
    if (!dragging.current) return;
    deltaX.current = getX(e) - startX.current;
  };
  const onUp = () => {
    if (!dragging.current) return;
    const threshold = 50;
    if (Math.abs(deltaX.current) > threshold) {
      deltaX.current < 0 ? next() : prev();
    }
    dragging.current = false;
    deltaX.current = 0;
    setTimeout(() => setPaused(false), 800);
  };

  // Autoplay timers
  const intervalRef = useRef(null);
  const fallbackRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    fallbackRef.current = null;
  }, []);

  const current = slides[idx];

  useEffect(() => {
    clearTimers();

    if (!auto || paused || userInteracted || slides.length <= 1) return;
    if (!current) return;

    if (current.type === "video") {
      // fallback in case 'ended' never fires
      fallbackRef.current = setTimeout(() => {
        next();
      }, 12000);
      return () => clearTimers();
    }

    intervalRef.current = setInterval(() => {
      next();
    }, 4500);

    return () => clearTimers();
  }, [auto, paused, userInteracted, slides.length, current?.type, idx, next, clearTimers]);

  if (slides.length === 0) return null;

  return (
    <div
      className={`
        relative w-full overflow-hidden rounded-2xl 
        bg-slate-200/40 select-none shadow-xl 
        backdrop-blur-sm perspective-[2000px]
        ${heightClass}
      `}
      role="region"
      aria-label="Galería del paquete"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-full w-full flex items-center justify-center" style={{ perspective: "2000px" }}>
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(-${idx * 100}%)`,
            transformStyle: "preserve-3d",
            touchAction: "pan-y",
          }}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
          onMouseDown={(e) => {
            e.preventDefault();
            onDown(e);
          }}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          aria-roledescription="carousel"
        >
          {slides.map((m, i) => {
            const isActive = i === idx;
            const offset = i - idx;

            return (
              <div
                key={`${m.url}-${i}`}
                className="relative flex-shrink-0 w-full h-full transition-all duration-500 ease-out"
                style={{
                  transform: `translateX(${offset * 60}px) scale(${isActive ? 1 : 0.9}) rotateY(${offset * -18}deg)`,
                  opacity: isActive ? 1 : 0.45,
                  filter: isActive ? "drop-shadow(0 20px 30px rgba(0,0,0,0.25))" : "blur(1px)",
                  zIndex: isActive ? 30 : 10,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/40 rounded-2xl pointer-events-none" />

                {m.type === "video" ? (
                  <video
                    src={m.url}
                    className="w-full h-full object-cover rounded-2xl"
                    controls
                    playsInline
                    preload="metadata"
                    onEnded={() => {
                      if (!paused && !userInteracted) next();
                    }}
                    onError={() => {
                      if (!paused && !userInteracted) next();
                    }}
                  />
                ) : (
                  <img
                    src={m.url}
                    alt={m.alt || ""}
                    className="w-full h-full object-cover rounded-2xl"
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Anterior"
            className="
              absolute left-4 top-1/2 -translate-y-1/2
              h-12 w-12 rounded-full
              bg-white/20 backdrop-blur-lg border border-white/30
              text-white text-2xl
              grid place-items-center
              shadow-lg
              hover:bg-white/30 hover:scale-110
              transition-all duration-200
            "
          >
            ‹
          </button>

          <button
            type="button"
            onClick={next}
            aria-label="Siguiente"
            className="
              absolute right-4 top-1/2 -translate-y-1/2
              h-12 w-12 rounded-full
              bg-white/20 backdrop-blur-lg border border-white/30
              text-white text-2xl
              grid place-items-center
              shadow-lg
              hover:bg-white/30 hover:scale-110
              transition-all duration-200
            "
          >
            ›
          </button>

          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-3">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i, true)}
                aria-label={`Ir al slide ${i + 1}`}
                className={`
                  h-3 w-3 rounded-full border border-white/40
                  transition-all duration-300
                  backdrop-blur-md
                  ${i === idx ? "bg-white scale-125 shadow-lg" : "bg-white/40 hover:bg-white/70"}
                `}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
