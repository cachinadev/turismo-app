// frontend/app/components/GalleryLightbox.jsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * GalleryLightbox
 * - media: [{ url, type: 'image' | 'video', alt?, caption? }]
 * - cols: número de columnas en grid (sm/md) -> { base: number, md: number }
 */
export default function GalleryLightbox({ media = [], cols = { base: 3, md: 4 } }) {
  const items = Array.isArray(media)
    ? media.filter(m => m && m.url && (m.type === 'image' || m.type === 'video'))
    : [];

  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const overlayRef = useRef(null);

  // --- Keep idx valid if items change
  useEffect(() => {
    if (!items.length) return;
    setIdx(i => Math.min(Math.max(0, i), items.length - 1));
  }, [items.length]);

  const close = useCallback(() => setOpen(false), []);
  const openAt = useCallback((i) => { setIdx(i); setOpen(true); }, []);
  const prev = useCallback(() => setIdx(i => (i - 1 + items.length) % items.length), [items.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % items.length), [items.length]);

  // --- ESC / flechas
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, prev, next]);

  // --- Lock body scroll + focus dialog on open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    overlayRef.current?.focus?.();
    return () => { document.body.style.overflow = prevOverflow; };
  }, [open]);

  // --- Swipe gestures (mobile)
  const touchRef = useRef({ x: null, y: null });
  const onTouchStart = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    const t = touchRef.current;
    if (!t || t.x == null) return;
    const up = e.changedTouches?.[0];
    if (!up) return;
    const dx = up.clientX - t.x;
    const dy = up.clientY - t.y;
    // Horizontal, minimal vertical movement
    if (Math.abs(dx) > 40 && Math.abs(dy) < 60) {
      if (dx < 0) next();
      else prev();
    }
    touchRef.current = { x: null, y: null };
  };

  if (items.length === 0) return null;

  // --- Tailwind grid cols helper + safelist
  // (These classes appear literally so Tailwind picks them up)
  const _SAFE_ = 'grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4 grid-cols-5 grid-cols-6 md:grid-cols-1 md:grid-cols-2 md:grid-cols-3 md:grid-cols-4 md:grid-cols-5 md:grid-cols-6';
  const colCls = (n) => {
    const map = {1:'grid-cols-1',2:'grid-cols-2',3:'grid-cols-3',4:'grid-cols-4',5:'grid-cols-5',6:'grid-cols-6'};
    return map[Number(n)] || 'grid-cols-3';
  };
  const gridCls = `grid ${colCls(cols.base)} md:${colCls(cols.md)} gap-3`;

  // Current item details
  const cur = items[idx] || {};
  const curAlt = cur.alt || (cur.type === 'video' ? 'Video' : 'Imagen');

  return (
    <>
      {/* Thumbnails */}
      <div className={gridCls}>
        {items.map((m, i) => (
          <button
            key={`${m.url}-${i}`}
            type="button"
            className="relative rounded overflow-hidden border focus:outline-none focus:ring-2 focus:ring-brand-600"
            onClick={() => openAt(i)}
            aria-label={`Ver ${m.type === 'video' ? 'video' : 'imagen'} ${i + 1}`}
          >
            {m.type === 'video' ? (
              <video
                src={m.url}
                className="w-full h-24 object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              // decorative in the grid; main alt is in the lightbox
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.url}
                className="w-full h-24 object-cover"
                alt=""
                loading="lazy"
                decoding="async"
                draggable="false"
              />
            )}
            {m.type === 'video' && (
              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                Video
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 outline-none"
          onClick={(e) => { if (e.target === overlayRef.current) close(); }}
          role="dialog"
          aria-modal="true"
          aria-label="Galería de medios"
          tabIndex={-1}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="relative max-w-5xl w-full">
            {/* Top controls */}
            <div className="absolute -top-12 right-0 flex items-center gap-2 text-white">
              <button
                className="px-3 py-1 rounded border border-white/40 hover:bg-white/10"
                onClick={prev}
                aria-label="Anterior"
                type="button"
              >
                ←
              </button>
              <span className="text-sm opacity-80">{idx + 1} / {items.length}</span>
              <button
                className="px-3 py-1 rounded border border-white/40 hover:bg-white/10"
                onClick={next}
                aria-label="Siguiente"
                type="button"
              >
                →
              </button>
              <button
                className="ml-2 px-3 py-1 rounded border border-white/40 hover:bg-white/10"
                onClick={close}
                aria-label="Cerrar"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="rounded-lg overflow-hidden shadow-2xl bg-black">
              {cur.type === 'video' ? (
                <video
                  key={cur.url} // restart on change
                  src={cur.url}
                  className="w-full max-h-[78vh] object-contain bg-black"
                  controls
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cur.url}
                  className="w-full max-h-[78vh] object-contain bg-black"
                  alt={curAlt}
                  loading="eager"
                  decoding="async"
                  draggable="false"
                />
              )}
            </div>

            {/* Large side navigation (desktop) */}
            <button
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center text-white/90 hover:text-white"
              onClick={prev}
              aria-label="Anterior"
              type="button"
            >
              ‹
            </button>
            <button
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center text-white/90 hover:text-white"
              onClick={next}
              aria-label="Siguiente"
              type="button"
            >
              ›
            </button>

            {/* Optional caption */}
            {cur.caption && (
              <div className="mt-2 text-center text-white/80 text-sm">{cur.caption}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
