"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Compass, ArrowRight, Waves, Trees, Sun, Play } from "lucide-react";

/* ---------------------------------------------
 * Helpers
 * --------------------------------------------- */
const isVideo = (src = "") => /\.(mp4|webm|ogg)$/i.test(src);

// Encode accents / spaces safely for /public paths
const safeUrl = (src = "") => {
  if (!src) return src;
  if (/^https?:\/\//i.test(src)) return src;
  const s = src.startsWith("/") ? src : `/${src}`;
  return encodeURI(s);
};

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

export default function HeroLanding() {
  const params = useParams();
  const locale = params?.locale || "es";

  const [messages, setMessages] = useState({});
  const [activeCategory, setActiveCategory] = useState("sierra");

  // Media rotation
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const videoRef = useRef(null);
  const imageIntervalRef = useRef(null);
  const fallbackTimeoutRef = useRef(null);
  const transitionTimeoutRef = useRef(null);

  const [reduceMotion, setReduceMotion] = useState(false);

  /* ---------------------------------------------
   * Reduced motion
   * --------------------------------------------- */
  useEffect(() => {
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const apply = () => setReduceMotion(!!mq.matches);
      apply();
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    } catch {}
  }, []);

  /* ---------------------------------------------
   * Pause when tab hidden
   * --------------------------------------------- */
  useEffect(() => {
    const onVis = () => document.hidden && setIsPaused(true);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /* ---------------------------------------------
   * Load locale messages
   * --------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const mod = await import(`@/messages/${locale}.json`);
        setMessages(mod.default?.HeroLanding || {});
      } catch {
        setMessages({});
      }
    })();
  }, [locale]);

  const t = useCallback(
    (key, fallback = "") => {
      const parts = key.split(".");
      let value = messages;
      for (const p of parts) value = value?.[p];
      return typeof value === "string" ? value : fallback;
    },
    [messages]
  );

  /* ---------------------------------------------
   * Categories (ONLY existing files)
   * --------------------------------------------- */
  const categories = useMemo(
    () => [
      {
        id: "sierra",
        name: t("sierra.name", "SIERRA"),
        subtitle: t("sierra.subtitle", "Cumbres & Tradición"),
        gradient: "from-[#0E374A] via-[#0086C0] to-[#0E374A]",
        media: [
          "/brand/urus.JPG",
          "/brand/qalasaya.JPG",
          "/brand/pukara.JPG",
          "/brand/urus3.JPG",
        ].map(safeUrl),
      },
      {
        id: "costa",
        name: t("costa.name", "COSTA"),
        subtitle: t("costa.subtitle", "Olas & Arena"),
        gradient: "from-[#0086C0] via-[#A3B117] to-[#0086C0]",
        media: [
          "/brand/Máncora – Piura.webp",
          "/brand/Máncora – Piura2.webp",
          "/brand/Punta Sal – Tumbes.webp",
          "/brand/Islas Ballestas.webp",
          "/brand/Paracas – Reserva Nacional.webp",
        ].map(safeUrl),
      },
      {
        id: "selva",
        name: t("selva.name", "SELVA"),
        subtitle: t("selva.subtitle", "Verde & Vida"),
        gradient: "from-[#A3B117] via-[#0E374A] to-[#A3B117]",
        media: [
          "/brand/Catarata amazónica – Región San Martín (Tarapoto).webp",
          "/brand/Río amazónico con bungalows – Iquitos (Loreto).webp",
          "/brand/Mirador en la copa de los árboles – Reserva Nacional Tambopata (Madre de Dios).webp",
          "/brand/parque.webp",
          "/brand/temploblanco.JPG",
        ].map(safeUrl),
      },
    ],
    [t]
  );

  const currentCategory =
    categories.find((c) => c.id === activeCategory) || categories[0];

  const mediaList = currentCategory.media;
  const currentMedia = mediaList[activeMediaIndex];

  /* ---------------------------------------------
   * Timers
   * --------------------------------------------- */
  const clearTimers = useCallback(() => {
    if (imageIntervalRef.current) clearInterval(imageIntervalRef.current);
    if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
  }, []);

  const goToMedia = useCallback(
    (idx) => {
      const safeIdx = clamp(idx, 0, mediaList.length - 1);
      setIsTransitioning(true);
      transitionTimeoutRef.current = setTimeout(() => {
        setActiveMediaIndex(safeIdx);
        setIsTransitioning(false);
      }, reduceMotion ? 0 : 220);
    },
    [mediaList.length, reduceMotion]
  );

  const nextMedia = useCallback(
    () => goToMedia((activeMediaIndex + 1) % mediaList.length),
    [activeMediaIndex, mediaList.length, goToMedia]
  );

  /* ---------------------------------------------
   * Auto-rotation
   * --------------------------------------------- */
  useEffect(() => {
    clearTimers();
    if (isPaused || reduceMotion || mediaList.length <= 1) return;

    if (isVideo(currentMedia)) {
      fallbackTimeoutRef.current = setTimeout(nextMedia, 12000);
      return;
    }

    imageIntervalRef.current = setInterval(nextMedia, 5200);

    return clearTimers;
  }, [currentMedia, isPaused, reduceMotion, mediaList.length, nextMedia, clearTimers]);

  /* ---------------------------------------------
   * Play video on change
   * --------------------------------------------- */
  useEffect(() => {
    if (!isVideo(currentMedia)) return;
    const v = videoRef.current;
    if (!v) return;
    try {
      v.currentTime = 0;
      v.play().catch(() => {});
    } catch {}
  }, [currentMedia]);

  /* ---------------------------------------------
   * Category switch
   * --------------------------------------------- */
  const changeCategory = (id) => {
    clearTimers();
    setActiveCategory(id);
    setActiveMediaIndex(0);
    setIsPaused(false);
  };

  return (
    <main className="relative bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      {/* Category Tabs */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
        <div className="flex justify-center gap-2 p-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => changeCategory(cat.id)}
              className={`px-5 py-2 rounded-xl font-bold transition ${
                cat.id === activeCategory
                  ? `bg-gradient-to-r ${cat.gradient} text-white`
                  : "bg-slate-100 text-slate-600 hover:bg-white"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <section className="py-10">
        <div className="container mx-auto grid lg:grid-cols-2 gap-10 items-center px-6">
          {/* Media */}
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="relative h-[420px]">
              {isVideo(currentMedia) ? (
                <>
                  <video
                    ref={videoRef}
                    src={currentMedia}
                    muted
                    playsInline
                    autoPlay
                    preload="metadata"
                    className={`w-full h-full object-cover transition ${
                      isTransitioning ? "opacity-0 scale-110" : "opacity-100"
                    }`}
                    onEnded={nextMedia}
                    onError={nextMedia}
                  />
                  <div className="absolute top-4 right-4 bg-black/50 px-2 py-1 rounded text-white text-xs flex gap-1">
                    <Play className="w-3 h-3" /> Video
                  </div>
                </>
              ) : (
                <Image
                  src={currentMedia}
                  alt={currentCategory.name}
                  fill
                  className={`object-cover transition ${
                    isTransitioning ? "opacity-0 scale-110" : "opacity-100"
                  }`}
                  priority
                />
              )}
            </div>
          </div>

          {/* Text */}
          <div>
            <h2 className="text-4xl font-black bg-gradient-to-r from-[#0E374A] via-[#0086C0] to-[#A3B117] bg-clip-text text-transparent">
              {currentCategory.name}
            </h2>
            <p className="text-xl text-slate-600 mt-4">{currentCategory.subtitle}</p>

            <Link href={`/${locale}/packages?region=${activeCategory}`}>
              <button className="mt-8 px-8 py-4 bg-gradient-to-r from-[#0E374A] to-[#0086C0] text-white rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition">
                {t("cta", "Descubrir")}
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
