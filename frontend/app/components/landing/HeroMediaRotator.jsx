"use client";

import { useEffect, useRef } from "react";

/**
 * HeroMediaRotator (VIDEO ONLY)
 *
 * - Plays a single background video
 * - Autoplay works (muted + playsInline)
 * - Optional poster image
 * - No rotation, no images, no timers
 */
export default function HeroMediaRotator({
  src = "/video/hero.mp4",
  poster = "/video/hero-poster.jpg",
  loop = true,
  className = "",
}) {
  const videoRef = useRef(null);

  /* ---------------------------------------------
   * Ensure autoplay on mount
   * --------------------------------------------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = true;        // REQUIRED for autoplay
      video.playsInline = true; // REQUIRED for iOS
      video.currentTime = 0;

      const p = video.play();
      if (p?.catch) p.catch(() => {});
    } catch {}
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
        autoPlay
        loop={loop}
        preload="auto"
        poster={poster}
      >
        <source src={src} type="video/mp4" />
        {/* Fallback text */}
        Your browser does not support the video tag.
      </video>

      {/* Optional readability overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/45" />
    </div>
  );
}
