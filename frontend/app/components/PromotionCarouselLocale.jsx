// app/components/PromotionCarouselLocale.jsx
'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Link from 'next/link';
import { Clock, MapPin } from 'lucide-react';

// Función para formatear dinero (copiada de tu código)
const money = (v, curr = 'PEN', locale = 'en-US') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: (curr || 'PEN').toUpperCase(),
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

// Función para obtener imágenes (copiada de tu código)
const imgListFrom = (p) => {
  const imgs = Array.isArray(p?.media)
    ? p.media.filter(m => m && m.url && (m.type === 'image' || !m.type)).map(m => m.url)
    : [];
  return imgs.length ? imgs.slice(0, 8) : ['https://picsum.photos/600/400'];
};

export default function PromotionCarouselLocale({ promotionalPackages, lang }) {
  if (!promotionalPackages || promotionalPackages.length === 0) {
    return null;
  }

  return (
    <section id="special-offers" className="relative bg-white">
      <div className="container mx-auto px-6">
        {/* CARRUSEL SWIPER */}
        <div className="relative max-w-7xl mx-auto">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={30}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 4 },
            }}
            navigation={true}
            pagination={{ clickable: true }}
            autoplay={{ delay: 1000, disableOnInteraction: false }}
            loop={true}
            className="pb-12"
          >
            {promotionalPackages.slice(0, 6).map((pkg) => {
              const id = pkg._id || pkg.id || pkg.slug;
              const images = imgListFrom(pkg);
              const promo = !!pkg.isPromoActive && (pkg.effectivePrice ?? null) !== null;
              const priceNow = Number(pkg.effectivePrice ?? pkg.price);
              const rawPct = promo && Number(pkg.price) > 0 ? Math.round((1 - priceNow / Number(pkg.price)) * 100) : Number(pkg?.promoPercent) || 0;
              const percent = Math.max(0, Math.min(100, rawPct || 0));
              const discount = promo && Number(pkg.price) > priceNow ? Number(pkg.price) - priceNow : 0;

              return (
                <SwiperSlide key={id} className="h-auto">
                  {/* COPIA EXACTA de tu tarjeta de packages page */}
                  <div className="h-full px-2">
                    <Link 
                      href={`/${lang}/packages/${pkg.slug}`} 
                      className="card-hover group block bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 h-full"
                    >
                      <div className="image-container relative h-48 overflow-hidden">
                        {images[0] && (
                          <img 
                            src={images[0]} 
                            alt={pkg.title} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                            loading="lazy" 
                            decoding="async" 
                          />
                        )}
                        <div className="absolute inset-0 gradient-overlay"></div>
                        
                        {/* Duración */}
                        {pkg.durationHours && (
                          <div className="absolute top-3 left-3">
                            <div className="px-3 py-1.5 rounded-full shadow-lg bg-[#0086C0]/90 backdrop-blur-sm flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-white" />
                              <span className="font-bree text-xs text-white">{pkg.durationHours} horas</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Descuento */}
                        {promo && discount > 0 && (
                          <div className="absolute top-3 right-3 bg-red-500 px-2.5 py-1 rounded-full">
                            <span className="font-bree text-xs text-white">-{percent}% OFF</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4 relative z-10">
                        <div className="mb-2">
                          <span className="font-tequilla text-[10px] uppercase tracking-wider text-slate-400">PAQUETE</span>
                        </div>
                        
                        <h3 className="font-bree text-base mb-2 line-clamp-2 group-hover:text-[#0086C0] transition-colors leading-tight" style={{ color: '#0E374A' }}>
                          {pkg.title}
                        </h3>
                        
                        <p className="font-tequilla text-xs text-slate-600 mb-3 flex items-center gap-1">
                          <MapPin size={12} color="#0086C0" />
                          {pkg.city || 'Perú'}
                        </p>
                        
                        {/* Precio con descuento */}
                        {promo && discount > 0 && (
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-tequilla text-xs line-through text-slate-400">
                              {money(Number(pkg.price), pkg.currency)}
                            </p>
                            <p className="font-bree text-xs" style={{ color: '#A3B117' }}>
                              Ahorras {money(discount, pkg.currency)}
                            </p>
                          </div>
                        )}
                        
                        <div className="mb-3">
                          <p className="font-tequilla text-[10px] text-slate-400 mb-1">Precio final por persona</p>
                          <div className="flex items-baseline gap-1">
                            <span className="font-bree text-lg" style={{ color: '#0086C0' }}>
                              {pkg.currency}
                            </span>
                            <span className="font-bree text-2xl" style={{ color: '#0E374A' }}>
                              {priceNow.toLocaleString()}
                            </span>
                          </div>
                          <p className="font-tequilla text-[9px] text-slate-400 mt-0.5">
                            Incluye impuestos, tasas y cargos
                          </p>
                        </div>
                        
                        <button className="w-full py-2 rounded-lg font-bree text-sm text-white transition-all group-hover:scale-[1.02]" style={{ backgroundColor: '#0086C0' }}>
                          Ver más →
                        </button>
                      </div>
                    </Link>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>

      </div>
 
    </section>
  );
}

