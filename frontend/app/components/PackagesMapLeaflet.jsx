// frontend/app/components/PackagesMapLeaflet.jsx
'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

export default function PackagesMapLeaflet({
  packages = [],
  center = { lat: -9.1899, lng: -75.0152 },
  zoom = 5,
  selectedId,
  onSelect,
  onBoundsChanged,
  formatPrice = (v) => String(v ?? ''),
  titleFallback = 'Package',
  className = 'h-[600px] w-full rounded-2xl shadow-sm border border-slate-200 overflow-hidden',
}) {
  const mapElRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const LRef = useRef(null);
  const markersRef = useRef([]);

  // init once
  useEffect(() => {
    let mounted = true;

    (async () => {
      const L = (await import('leaflet')).default;
      if (!mounted) return;
      LRef.current = L;

      const map = L.map(mapElRef.current, {
        center: [center.lat, center.lng],
        zoom,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const report = () => {
        const b = map.getBounds();
        onBoundsChanged?.({
          n: b.getNorth(),
          s: b.getSouth(),
          e: b.getEast(),
          w: b.getWest(),
        });
      };
      map.on('moveend', report);
      setTimeout(report, 0);

      mapInstanceRef.current = map;
    })();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = LRef.current;
    if (!map || !L) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const withCoords = packages.filter(
      (p) => typeof p?.location?.lat === 'number' && typeof p?.location?.lng === 'number'
    );

    withCoords.forEach((p) => {
      const pid = p._id || p.id || p.slug;
      const isSel = pid === selectedId;
      const thumb = (p.markerThumb || '').replace(/'/g, "\\'");
      const price = formatPrice(Number(p.effectivePrice ?? p.price), p.currency);

      const icon = L.divIcon({
        className: 'thumb-marker',
        html: `
          <div class="thumb-wrap ${isSel ? 'thumb-selected' : ''}">
            <div class="thumb-img" style="background-image:url('${thumb}')"></div>
            <div class="thumb-price">${price}</div>
          </div>
        `,
        iconSize: [78, 82],
        iconAnchor: [39, 82],
        popupAnchor: [0, -90],
      });

      const marker = L.marker([p.location.lat, p.location.lng], { icon })
        .addTo(map)
        .on('click', () => onSelect?.(p));

      marker.bindTooltip(
        `<div style="font-weight:700">${p.title || titleFallback}</div>
         <div style="font-size:12px;opacity:.85">${p.city || ''}</div>`,
        { direction: 'top', offset: L.point(0, -78), opacity: 0.9 }
      );

      markersRef.current.push(marker);
    });

    if (withCoords.length > 0) {
      const bounds = L.latLngBounds(withCoords.map((p) => [p.location.lat, p.location.lng]));
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.18), { animate: false });
    }

    const styleId = 'thumb-marker-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .thumb-marker .thumb-wrap{position:relative;width:78px;height:78px;border-radius:16px;box-shadow:0 6px 22px rgba(14,55,74,.18);overflow:hidden;border:2px solid rgba(255,255,255,.95);background:linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.78))}
        .thumb-marker .thumb-wrap.thumb-selected{box-shadow:0 10px 30px rgba(0,134,192,0.28);transform:translateY(-3px)}
        .thumb-marker .thumb-img{width:100%;height:100%;background-size:cover;background-position:center;transform:scale(1.0);transition:transform .25s cubic-bezier(.2,.9,.2,1)}
        .thumb-marker .thumb-wrap:hover .thumb-img{transform:scale(1.08)}
        .thumb-marker .thumb-price{position:absolute;left:6px;bottom:6px;padding:4px 8px;border-radius:999px;background:linear-gradient(90deg,#0086C0,#0E374A);color:#fff;font-size:11px;font-weight:800;box-shadow:0 6px 14px rgba(14,55,74,.18)}
      `;
      document.head.appendChild(style);
    }
  }, [packages, selectedId, onSelect, onBoundsChanged, formatPrice, titleFallback]);

  return <div ref={mapElRef} className={className} />;
}
