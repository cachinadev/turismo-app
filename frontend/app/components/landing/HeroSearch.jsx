// frontend/app/components/landing/HeroSearch.jsx
"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const LOCALES = ["es", "en", "fr", "pt", "ru"];
const CITIES = ["Puno", "Cusco", "Arequipa", "Lima", "Others"];
const SUGGESTIONS = ["Uros Islands", "Taquile", "Machu Picchu"];

export default function HeroSearch() {
  const router = useRouter();
  const pathname = usePathname() || "/";

  // Locale prefix detection (so /en stays /en)
  const firstSeg = pathname.split("/")[1] || "";
  const currentLocale = LOCALES.includes(firstSeg) ? firstSeg : null;
  const localizedPath = (p) => (currentLocale ? `/${currentLocale}${p}` : p);

  const [q, setQ] = useState("");
  const [city, setCity] = useState("Puno");

  function onSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (city) params.set("city", city);
    router.push(`${localizedPath("/packages")}?${params.toString()}`);
  }

  function quick(term) {
    setQ(term);
    setTimeout(() => {
      const params = new URLSearchParams({ q: term, city });
      router.push(`${localizedPath("/packages")}?${params.toString()}`);
    }, 0);
  }

  return (
    <div className="mx-auto w-full max-w-2xl bg-white/95 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-slate-200">
      {/* Search form */}
      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        role="search"
        aria-label="Package search"
      >
        {/* Keyword */}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input input-bordered w-full"
          placeholder="Search tours (Uros, Taquile, Machu Picchu...)"
          aria-label="Search by tour name or description"
          autoComplete="off"
        />

        {/* City */}
        <select
          className="select select-bordered w-full"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-label="Select city"
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-primary w-full font-semibold"
          aria-label="Search packages"
        >
          Search
        </button>
      </form>

      {/* Suggestions */}
      <div className="mt-4 text-center text-xs text-slate-600">
        Try:{" "}
        {SUGGESTIONS.map((s, i) => (
          <span key={s}>
            <button
              type="button"
              className="badge badge-ghost hover:bg-brand-50 hover:text-brand-700 transition px-2 py-1"
              title={`Search for ${s}`}
              onClick={() => quick(s)}
            >
              {s}
            </button>
            {i < SUGGESTIONS.length - 1 ? " " : null}
          </span>
        ))}
      </div>
    </div>
  );
}
