//frontend/app/components/MediaCarousel.jsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * MediaCarousel
 * Props:
 *  - media: [{ url, type: 'image' | 'video', alt? }]
 *  - heightClass: tailwind class for fixed height (default h-[420px])
 */
export default function MediaCarousel({ media = [], heightClass = 'h-[420px]' }) {
  const slides = Array.isArray(media)
    ? media.filter(m => m && m.url && (m.type === 'image' || m.type === 'video'))
    : [];

  const [idx, setIdx] = useState(0);

  const go = useCallback((i) => {
    if (!slides.length) return;
    const n = ((i % slides.length) + slides.length) % slides.length;
    setIdx(n);
  }, [slides.length]);

  const prev = useCallback(() => go(idx - 1), [go, idx]);
  const next = useCallback(() => go(idx + 1), [go, idx]);

  // Keyboard arrows
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  // Swipe (touch + mouse drag)
  const startX = useRef(0);
  const deltaX = useRef(0);
  const dragging = useRef(false);

  const getX = (e) =>
    'touches' in e ? e.touches?.[0]?.clientX ?? 0 : e.clientX ?? 0;

  const onDown = (e) => {
    dragging.current = true;
    startX.current = getX(e);
    deltaX.current = 0;
  };
  const onMove = (e) => {
    if (!dragging.current) return;
    deltaX.current = getX(e) - startX.current;
  };
  const onUp = () => {
    if (!dragging.current) return;
    const threshold = 50; // px
    if (Math.abs(deltaX.current) > threshold) {
      deltaX.current < 0 ? next() : prev();
    }
    dragging.current = false;
    deltaX.current = 0;
  };

  if (slides.length === 0) return null;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg bg-slate-100 select-none ${heightClass}`}
      role="region"
      aria-label="Galería del paquete"
    >
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${idx * 100}%)`, touchAction: 'pan-y' }}
        onTouchStart={onDown}
        onTouchMove={onMove}
        onTouchEnd={onUp}
        onMouseDown={(e) => { e.preventDefault(); onDown(e); }}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        aria-roledescription="carousel"
      >
        {slides.map((m, i) => (
          <div key={`${m.url}-${i}`} className="w-full h-full flex-shrink-0 bg-black">
            {m.type === 'video' ? (
              <video
                src={m.url}
                className="w-full h-full object-cover"
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.url}
                alt={m.alt || ''}
                className="w-full h-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            )}
          </div>
        ))}
      </div>

      {/* Arrows */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white grid place-items-center hover:bg-black/60"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Siguiente"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white grid place-items-center hover:bg-black/60"
          >
            ›
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Ir al slide ${i + 1}`}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  i === idx ? 'bg-white' : 'bg-white/60 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
