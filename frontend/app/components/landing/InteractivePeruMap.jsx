// frontend/app/components/landing/InteractivePeruMap.jsx
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { API_BASE, CONTACT_PHONE, WHATSAPP_NUMBER } from "@/app/lib/config";
import { mediaUrl } from "@/app/lib/media";
import {
  MapPin,
  DollarSign,
  Clock,
  Filter,
  ChevronDown,
  X,
  ZoomIn,
  ZoomOut,
  Navigation,
  MessageCircle,
  Globe,
  Tag,
  Award,
} from "lucide-react";

const CITY_CENTER = {
  Puno: { lat: -15.8402, lng: -70.0219 },
  Cusco: { lat: -13.5319, lng: -71.9675 },
  Lima: { lat: -12.0464, lng: -77.0428 },
  Arequipa: { lat: -16.409, lng: -71.5375 },
  Others: { lat: -9.1899, lng: -75.0152 },
};

const normalizeSlug = (s) => String(s || "").trim().replace(/^\/+|\/+$/g, "");
const safeNumber = (n, fallback = 0) => (Number.isFinite(Number(n)) ? Number(n) : fallback);
const WA_LINK_NUMBER =
  (String(WHATSAPP_NUMBER || CONTACT_PHONE).match(/\d+/g) || []).join("") ||
  "51953858267";

const usePackagesData = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  const fetchPackages = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_BASE}/api/packages?limit=100`, {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const listRaw = Array.isArray(data) ? data : data.items || [];

      const processedPackages = listRaw.map((p) => {
        const hasValidCoords =
          typeof p?.location?.lat === "number" && typeof p?.location?.lng === "number";

        let coords;
        if (hasValidCoords) {
          coords = { lat: p.location.lat, lng: p.location.lng };
        } else {
          const cityKey =
            Object.keys(CITY_CENTER).find((key) => key.toLowerCase() === p?.city?.toLowerCase()) ||
            "Others";
          coords = CITY_CENTER[cityKey];
        }

        const firstImage =
          Array.isArray(p.media) && p.media.length > 0
            ? mediaUrl(p.media[0].url)
            : `https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=400&h=300&fit=crop&q=80&auto=format`;

        let durationHours = p?.durationHours;
        if (!durationHours && p?.duration) {
          durationHours = typeof p.duration === "number" ? p.duration * 24 : null;
        }

        const slug = normalizeSlug(p?.slug);

        return {
          ...p,
          slug, // ✅ ensure normalized slug
          id: p.id || p._id || slug || Math.random().toString(36),
          coordinates: coords,
          media: Array.isArray(p.media) ? p.media.map((m) => ({ ...m, url: mediaUrl(m.url) })) : [],
          firstImage,
          durationHours: durationHours || null,
          priceValue: safeNumber(p.effectivePrice ?? p.price ?? 0, 0),
        };
      });

      setPackages(processedPackages);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.warn("Error loading packages:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      fetchPackages();
      hasLoadedRef.current = true;
    }

    return () => {
    };
  }, [fetchPackages]);

  return { packages, loading, refetch: fetchPackages };
};

const PackageCard = React.memo(({ pkg, onClick, t = (key, fallback) => fallback || key }) => (
  <div
    onClick={() => onClick(pkg)}
    className="group cursor-pointer transition-all duration-300 border-b last:border-0 p-4 hover:bg-gradient-to-r hover:from-[#0086C0]/5 hover:to-[#0E374A]/5 border-[#E2E8F0]"
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <span className="block font-bold text-base transition-colors group-hover:text-[#0086C0] text-[#0E374A] font-bree">
          {pkg.title}
        </span>
        <div className="flex items-center gap-3 mt-2">
          <span className="flex items-center gap-1 text-sm text-[#64748B] font-bree">
            <MapPin className="w-3 h-3" />
            {pkg.city}
          </span>
          <span className="flex items-center gap-1 text-sm text-[#64748B] font-bree">
            <Clock className="w-3 h-3" />
            {pkg.durationHours || "N/A"} {t("hours", "horas")}
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="inline-flex items-center gap-2 text-white px-3 py-1.5 rounded-full font-bold text-xs shadow-md group-hover:shadow-lg transition-all group-hover:scale-105 bg-gradient-135 from-[#0086C0] to-[#0E374A] font-bree">
          <DollarSign className="w-3 h-3" />
          {pkg.currency || "USD"} {pkg.priceValue}
        </div>
      </div>
    </div>
  </div>
));
PackageCard.displayName = "PackageCard";

const PackagePopup = React.memo(({ pkg, onClose, t = (key, fallback) => fallback || key, locale = "es" }) => {

  const pkgSlug = useMemo(() => normalizeSlug(pkg?.slug) || normalizeSlug(pkg?.id), [pkg?.slug, pkg?.id]);

  const handleWhatsApp = useCallback(() => {
    const message = t("whatsappMessage", `Hola, estoy interesado en el paquete: ${pkg.title}`).replace(
      "{title}",
      pkg.title
    );
    window.open(`https://wa.me/${WA_LINK_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
  }, [pkg.title, t]);

  // ✅ FIX: your valid route is /[locale]/packages/[slug] (plural)
  const handleDetails = useCallback(() => {
    if (!pkgSlug) return;
    window.open(`/${locale}/packages/${pkgSlug}`, "_blank");
  }, [pkgSlug, locale]);

  const imageUrl =
    pkg.media?.[0]?.url ||
    "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=400&h=300&fit=crop&q=80&auto=format";

  return (
    <div className="absolute top-6 left-6 bg-white rounded-2xl shadow-2xl p-6 max-w-sm z-[1000] border-2 border-[#0086C0] animate-fadeInUp">
      <button
        onClick={onClose}
        className="absolute -top-2 -right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg z-10 hover:scale-110 transition-transform border border-[#0086C0] hover:bg-[#0086C0] hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="space-y-5">
        <div className="h-48 rounded-xl overflow-hidden shadow-lg">
          <img
            src={imageUrl}
            alt={pkg.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        </div>

        <div>
          <h3 className="text-xl font-bold mb-3 text-[#0E374A] font-bree">{pkg.title}</h3>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-135 from-[#0086C0] to-[#0E374A]">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-[#64748B] font-bree">{t("location", "Ubicación")}</p>
                <p className="font-bold text-[#0E374A] font-bree">{pkg.city}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-135 from-[#A3B117] to-[#8B9A23]">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-[#64748B] font-bree">{t("duration", "Duración")}</p>
                <p className="font-bold text-[#0E374A] font-bree">
                  {pkg.durationHours ? `${pkg.durationHours} ${t("hours", "horas")}` : "N/A"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-5 p-4 rounded-xl bg-gradient-135 from-[#0086C0]/10 to-[#0E374A]/10">
            <div>
              <p className="text-xs text-[#64748B] font-bree">{t("priceFrom", "Precio desde")}</p>
              <p className="text-2xl font-bold text-[#0086C0] font-bree">
                {pkg.currency || "USD"} {pkg.priceValue}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-[#64748B] font-bree">{t("category", "Categoría")}</p>
              <p className="font-bold text-[#0E374A] font-bree">{pkg.category || "Tour"}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDetails}
              disabled={!pkgSlug}
              className="flex-1 py-3 rounded-xl font-bold text-white transition-all hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2 bg-gradient-135 from-[#0086C0] to-[#0E374A] font-bree disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Navigation className="w-5 h-5" />
              {t("viewDetails", "Ver detalles")}
            </button>

            <button
              onClick={handleWhatsApp}
              className="px-5 py-3 rounded-xl font-bold text-white transition-all hover:shadow-lg hover:scale-105 flex items-center gap-2 bg-[#25D366] font-bree"
            >
              <MessageCircle className="w-5 h-5" />
              {t("viewWhatsApp", "WhatsApp")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
PackagePopup.displayName = "PackagePopup";

/* ---- rest of your components unchanged (FilterControls, StatsCards, MapLegend, ZoomControls) ---- */

const FilterControls = React.memo(function FilterControls({
  filterCity,
  setFilterCity,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  uniqueCities,
  minPriceAvailable,
  maxPriceAvailable,
  t = (key, fallback) => fallback || key,
}) {
  return (
    <div className="flex flex-col md:flex-row gap-6 justify-center items-center mb-8">
      <div className="w-full md:w-auto">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-[#0086C0]" />
          <label className="text-sm font-bold text-[#0E374A] font-bree">
            {t("filterByCity", "Filtrar por ciudad:")}
          </label>
        </div>
        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="w-full md:w-64 px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-[#0086C0] focus:border-[#0086C0] transition-all bg-white border-[#E2E8F0] font-bree"
        >
          {uniqueCities.map((city) => (
            <option key={city} value={city} className="font-bree">
              {city === "all" ? t("allCities", "Todas las ciudades") : city}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full md:w-80">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-[#0086C0]" />
          <label className="text-sm font-bold text-[#0E374A] font-bree">
            {t("priceRange", "Rango")}: ${minPrice} - ${maxPrice}
          </label>
        </div>
        <div className="flex flex-col gap-3">
          <input
            type="range"
            min={minPriceAvailable}
            max={maxPriceAvailable}
            value={minPrice}
            onChange={(e) => setMinPrice(Number(e.target.value))}
            className="w-full h-2 bg-gradient-to-r from-[#0086C0]/20 to-[#A3B117]/20 rounded-lg appearance-none cursor-pointer"
          />
          <input
            type="range"
            min={minPriceAvailable}
            max={maxPriceAvailable}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-full h-2 bg-gradient-to-r from-[#A3B117]/20 to-[#0086C0]/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
});
FilterControls.displayName = "FilterControls";

const StatsCards = React.memo(({ packages, t = (key, fallback) => fallback || key }) => {
  const stats = useMemo(() => {
    const uniqueCities = Array.from(new Set(packages.map((p) => p.city))).length;
    const avgPrice =
      packages.length > 0
        ? Math.round(packages.reduce((sum, p) => sum + p.priceValue, 0) / packages.length)
        : 0;

    return [
      { value: packages.length, label: t("totalPackages", "Total de paquetes"), color: "#0086C0" },
      { value: uniqueCities, label: t("citiesAvailable", "Ciudades disponibles"), color: "#A3B117" },
      { value: avgPrice, label: t("avgPrice", "Precio promedio (USD)"), color: "#0E374A" },
    ];
  }, [packages, t]);

  return (
    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="group bg-white rounded-2xl p-6 shadow-lg text-center border border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all duration-500 hover:-translate-y-2"
        >
          <div className="text-4xl font-black mb-2 font-bree" style={{ color: stat.color }}>
            {stat.value}
          </div>
          <div className="text-sm font-bold text-[#0E374A] font-bree">{stat.label}</div>
          <div className="h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-3" />
        </div>
      ))}
    </div>
  );
});
StatsCards.displayName = "StatsCards";

const MapLegend = React.memo(({ t = (key, fallback) => fallback || key }) => (
  <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl z-[999] border border-slate-200">
    <h4 className="font-bold text-base mb-3 flex items-center gap-2 text-[#0E374A] font-bree">
      <Award className="w-5 h-5 text-[#0086C0]" />
      {t("mapLegend", "Leyenda del mapa")}
    </h4>
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-135 from-[#0086C0] to-[#0E374A]">
          <Tag className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium text-[#0E374A] font-bree">{t("tourPackages", "Paquetes turísticos")}</span>
      </div>
      <div className="text-xs text-[#64748B] pl-1 font-bree">{t("clickMarkers", "Haz clic en los marcadores para ver detalles")}</div>
    </div>
  </div>
));
MapLegend.displayName = "MapLegend";

const ZoomControls = React.memo(({ mapRef }) => (
  <div className="absolute top-6 right-6 flex flex-col gap-3 z-[999]">
    <button
      onClick={() => mapRef.current?.zoomIn()}
      className="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform border border-slate-200 hover:border-[#0086C0] hover:bg-[#0086C0] group"
    >
      <ZoomIn className="w-6 h-6 text-[#0E374A] group-hover:text-white transition-colors" />
    </button>
    <button
      onClick={() => mapRef.current?.zoomOut()}
      className="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform border border-slate-200 hover:border-[#A3B117] hover:bg-[#A3B117] group"
    >
      <ZoomOut className="w-6 h-6 text-[#0E374A] group-hover:text-white transition-colors" />
    </button>
  </div>
));
ZoomControls.displayName = "ZoomControls";

export default function InteractiveMap() {
  const params = useParams();
  const locale = params?.locale || "es";
  const [messages, setMessages] = useState({});
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [filterCity, setFilterCity] = useState("all");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(5000);

  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const mapInitializedRef = useRef(false);

  const { packages, loading } = usePackagesData();

  useEffect(() => {
    async function loadMessages() {
      try {
        const mod = await import(`@/messages/${locale}.json`);
        setMessages(mod.default?.InteractiveMap || {});
      } catch (error) {
        console.error(`Failed to load messages for locale: ${locale}`, error);
      }
    }
    loadMessages();
  }, [locale]);

  const t = (key, fallback = "") => {
    const parts = key.split(".");
    let value = messages;
    for (const part of parts) value = value?.[part];
    return typeof value === "string" ? value : fallback;
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    const resizeHandler = () => requestAnimationFrame(checkMobile);
    window.addEventListener("resize", resizeHandler);
    return () => window.removeEventListener("resize", resizeHandler);
  }, []);

  useEffect(() => {
    if (mapInitializedRef.current || typeof window === "undefined" || !mapRef.current) return;

    const loadMap = async () => {
      try {
        if (!window.L) {
          await Promise.all([
            new Promise((resolve, reject) => {
              const link = document.createElement("link");
              link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
              link.rel = "stylesheet";
              link.crossOrigin = "";
              link.onload = resolve;
              link.onerror = reject;
              document.head.appendChild(link);
            }),
            new Promise((resolve, reject) => {
              const script = document.createElement("script");
              script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
              script.crossOrigin = "";
              script.async = true;
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            }),
          ]);
        }

        if (window.L && mapRef.current && !leafletMapRef.current) {
          const map = window.L.map(mapRef.current, {
            center: [-11.17, -75.03],
            zoom: 5,
            zoomControl: false,
            attributionControl: false,
            preferCanvas: true,
            fadeAnimation: true,
            markerZoomAnimation: true,
          });

          window.L
            .tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
              maxZoom: 19,
              attribution: "©OpenStreetMap, ©CartoDB",
            })
            .addTo(map);

          leafletMapRef.current = map;
          mapInitializedRef.current = true;
        }
      } catch (error) {
        console.warn("Error loading map:", error);
      }
    };

    loadMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        mapInitializedRef.current = false;
      }
      markersRef.current = [];
    };
  }, []);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const price = pkg.priceValue;
      const matchesCity = filterCity === "all" || pkg.city === filterCity;
      const matchesPrice = price >= minPrice && price <= maxPrice;
      return matchesCity && matchesPrice;
    });
  }, [packages, filterCity, minPrice, maxPrice]);

  const priceStats = useMemo(() => {
    const prices = packages.map((p) => p.priceValue).filter((p) => p > 0);
    return {
      max: prices.length > 0 ? Math.max(...prices) : 5000,
      min: prices.length > 0 ? Math.min(...prices) : 0,
    };
  }, [packages]);

  const uniqueCities = useMemo(
    () => ["all", ...new Set(packages.map((p) => p.city).filter(Boolean))],
    [packages]
  );

  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (filteredPackages.length === 0) return;

    const bounds = window.L.latLngBounds([]);
    let validMarkersCount = 0;

    filteredPackages.forEach((pkg) => {
      if (!pkg.coordinates || pkg.coordinates.lat == null || pkg.coordinates.lng == null) return;

      const lat = parseFloat(pkg.coordinates.lat);
      const lng = parseFloat(pkg.coordinates.lng);

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

      const marker = window.L
        .marker([lat, lng], {
          icon: window.L.divIcon({
            html: `
            <div class="marker-container" style="
              transform: translateY(0);
              transition: all 0.3s ease;
              filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
              cursor: pointer;
              position: relative;
            ">
              <div style="
                width: 50px;
                height: 50px;
                border-radius: 10px;
                overflow: hidden;
                border: 3px solid #0086C0;
                background: white;
                transition: all 0.3s ease;
              ">
                <img src="${pkg.firstImage}" style="width: 100%; height: 100%; object-fit: cover;" alt="${pkg.title}" loading="lazy" />
              </div>
              <div style="
                background: linear-gradient(135deg, #0086C0, #0E374A);
                color: white;
                padding: 6px 10px;
                border-radius: 16px;
                font-weight: 600;
                font-size: 11px;
                margin-top: 4px;
                text-align: center;
                max-width: 140px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                transition: all 0.3s ease;
                transform: translateY(0);
              ">
                ${pkg.title.substring(0, 18)}${pkg.title.length > 18 ? "..." : ""}
              </div>
            </div>
          `,
            className: "custom-marker",
            iconSize: [160, 90],
            iconAnchor: [80, 80],
          }),
        })
        .addTo(leafletMapRef.current);

      bounds.extend([lat, lng]);
      validMarkersCount++;
      markersRef.current.push(marker);

      marker.on("click", () => {
        setSelectedPackage(pkg);
        leafletMapRef.current.flyTo([lat, lng], 10, { duration: 1.2, easeLinearity: 0.25 });
      });
    });

    if (validMarkersCount > 0 && bounds.isValid()) {
      try {
        leafletMapRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: filteredPackages.length === 1 ? 10 : undefined,
        });
      } catch {
        leafletMapRef.current.setView([-11.17, -75.03], 5);
      }
    }
  }, [filteredPackages]);

  const handlePackageClick = useCallback(
    (pkg) => {
      if (!pkg.coordinates) return;

      setSelectedPackage(pkg);
      if (leafletMapRef.current) {
        leafletMapRef.current.flyTo([pkg.coordinates.lat, pkg.coordinates.lng], 10, { duration: 1.2 });
      }
      if (isMobile) setShowDropdown(false);
    },
    [isMobile]
  );

  const clearFilters = useCallback(() => {
    setFilterCity("all");
    setMinPrice(priceStats.min);
    setMaxPrice(priceStats.max);
  }, [priceStats.min, priceStats.max]);

  return (
    <div className="w-full bg-gradient-to-b from-white via-[#F8FAFC] to-white px-4 sm:px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <FilterControls
            filterCity={filterCity}
            setFilterCity={setFilterCity}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            uniqueCities={uniqueCities}
            minPriceAvailable={priceStats.min}
            maxPriceAvailable={priceStats.max}
            t={t}
          />
        </div>

        <div className="flex flex-col md:flex-row md:h-[600px] overflow-hidden rounded-2xl shadow-2xl border border-slate-200">
          {isMobile && (
            <div className="px-4 py-3">
              <div
                onClick={() => setShowDropdown(!showDropdown)}
                className="rounded-xl px-4 py-3 bg-white shadow-sm cursor-pointer flex justify-between items-center hover:shadow-md transition-shadow border border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/10 rounded-lg">
                    <Globe className="w-5 h-5 text-[#0086C0]" />
                  </div>
                  <span className="font-bold text-[#0E374A] font-bree">
                    {t("packages", "Paquetes")} ({filteredPackages.length})
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[#64748B] transition-transform duration-300 ${showDropdown ? "rotate-180" : ""}`}
                />
              </div>

              {showDropdown && (
                <div className="mt-2 rounded-xl bg-white shadow-lg max-h-96 overflow-y-auto border border-slate-200">
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0086C0] mx-auto" />
                    </div>
                  ) : filteredPackages.length > 0 ? (
                    filteredPackages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} onClick={handlePackageClick} t={t} />)
                  ) : (
                    <div className="p-8 text-center text-[#64748B]">
                      <p className="font-bree">{t("noPackages", "No hay paquetes disponibles")}</p>
                      <button
                        onClick={clearFilters}
                        className="mt-4 px-6 py-2.5 rounded-lg text-white font-bold transition-all hover:scale-105 shadow-lg bg-gradient-135 from-[#0086C0] to-[#0E374A] font-bree"
                      >
                        {t("clearFilters", "Limpiar filtros")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="hidden md:block w-[340px] flex-shrink-0 bg-white border-r border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/10 rounded-lg">
                    <Globe className="w-6 h-6 text-[#0086C0]" />
                  </div>
                  <h3 className="font-bold text-lg text-[#0E374A] font-bree">{t("packagesAvailable", "Paquetes Disponibles")}</h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#0086C0]/10 to-[#A3B117]/10 text-[#0086C0] font-bold text-sm">
                  {packages.length} {t("total", "total")}
                </span>
              </div>
            </div>

            <div className="overflow-y-auto h-[calc(100%-120px)] scrollbar-thin">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0086C0] mx-auto mb-4" />
                  <p className="text-[#64748B] font-bree">{t("loading", "Cargando paquetes...")}</p>
                </div>
              ) : filteredPackages.length > 0 ? (
                filteredPackages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} onClick={handlePackageClick} t={t} />)
              ) : (
                <div className="p-8 text-center text-[#64748B]">
                  <p className="font-bree">{t("noPackages", "No hay paquetes disponibles")}</p>
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-6 py-2.5 rounded-lg text-white font-bold transition-all hover:scale-105 shadow-lg bg-gradient-135 from-[#0086C0] to-[#0E374A] font-bree"
                  >
                    {t("clearFilters", "Limpiar filtros")}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="h-[500px] md:h-full w-full relative">
            <div ref={mapRef} className="w-full h-full rounded-r-xl bg-slate-100" onContextMenu={(e) => e.preventDefault()} />

            {selectedPackage && (
              <PackagePopup pkg={selectedPackage} onClose={() => setSelectedPackage(null)} t={t} locale={locale} />
            )}

            <MapLegend t={t} />
            <ZoomControls mapRef={leafletMapRef} />
          </div>
        </div>

        <StatsCards packages={packages} t={t} />
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp { animation: fadeInUp 0.3s ease-out; }
        .scrollbar-thin { scrollbar-width: thin; scrollbar-color: #0086C0 #F1F5F9; }
        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: #F1F5F9; border-radius: 3px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: linear-gradient(135deg, #0086C0, #0E374A); border-radius: 3px; }

        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          height: 20px; width: 20px; border-radius: 50%;
          background: linear-gradient(135deg, #0086C0, #0E374A);
          cursor: pointer; box-shadow: 0 2px 6px rgba(0, 134, 192, 0.4);
          border: 2px solid white;
        }

        .font-bree { font-family: "Bree Serif", serif; }
        .bg-gradient-135 { background: linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to)); }
        .leaflet-div-icon { background: transparent !important; border: none !important; }
        .leaflet-marker-pane { z-index: 600 !important; }
        .leaflet-marker-icon:hover { z-index: 1000 !important; }
      `}</style>
    </div>
  );
}
