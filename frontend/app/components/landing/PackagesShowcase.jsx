import { useMemo, useState } from 'react';
import { MapPin, Clock, Star, ChevronRight } from 'lucide-react';

// Simulación de datos para la demo
const mockFeatured = [
  {
    _id: '1',
    slug: 'punta-cana',
    title: 'Paquetes a Punta Cana',
    description: 'Hotel + Vuelo',
    city: 'Punta Cana',
    price: '3,404',
    currency: 'S/.',
    durationHours: 144,
    rating: 7.9,
    media: [{ url: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=600&h=400&fit=crop' }],
    nights: 5,
    discount: 227
  },
  {
    _id: '2',
    slug: 'cartagena',
    title: 'Paquetes a Cartagena de Indias',
    description: 'Hotel + Vuelo',
    city: 'Cartagena',
    price: '1,872',
    currency: 'S/.',
    durationHours: 144,
    rating: 9.1,
    media: [{ url: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=600&h=400&fit=crop' }],
    nights: 5
  },
  {
    _id: '3',
    slug: 'cusco',
    title: 'Paquetes a Cusco',
    description: 'Hotel + Vuelo',
    city: 'Cusco',
    price: '604',
    currency: 'S/.',
    durationHours: 168,
    rating: 7.6,
    media: [{ url: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=600&h=400&fit=crop' }],
    nights: 6
  },
  {
    _id: '4',
    slug: 'buenos-aires',
    title: 'Paquetes a Buenos Aires',
    description: 'Hotel + Vuelo',
    city: 'Buenos Aires',
    price: '1,988',
    currency: 'S/.',
    durationHours: 192,
    rating: 7.7,
    media: [{ url: 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=600&h=400&fit=crop' }],
    nights: 7
  }
];

export default function PackagesShowcase() {
  const [view, setView] = useState('list');
  const featured = mockFeatured;

  return (
    <section id="destacados" className="py-20 bg-gradient-to-b from-white to-slate-50">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Recursive:wght@400;600;700&display=swap');
        
        .font-bree {
          font-family: 'Recursive', sans-serif;
          font-weight: 600;
        }
        
        .font-tequilla {
          font-family: 'Recursive', sans-serif;
          font-weight: 400;
        }

        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card-hover:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(14, 55, 74, 0.15);
        }

        .gradient-overlay {
          background: linear-gradient(180deg, rgba(14, 55, 74, 0) 0%, rgba(14, 55, 74, 0.8) 100%);
        }

        .badge-offer {
          background: linear-gradient(135deg, #A3B117 0%, #8a9614 100%);
          box-shadow: 0 2px 8px rgba(163, 177, 23, 0.3);
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
          <div>
            <h2 className="font-bree text-4xl md:text-5xl mb-2" style={{ color: '#0E374A' }}>
              Descubre Perú
            </h2>
            <p className="font-tequilla text-lg" style={{ color: '#0086C0' }}>
              Paquetes turísticos a destinos populares con descuentos
            </p>
          </div>

          {/* View Toggle */}
          <div className="inline-flex rounded-2xl p-1.5 shadow-sm" style={{ backgroundColor: '#f8fafc', border: '2px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`px-6 py-2.5 text-sm font-bree rounded-xl transition-all duration-200 ${
                view === 'list' 
                  ? 'text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={view === 'list' ? { backgroundColor: '#0086C0' } : {}}
            >
              Listado
            </button>
            <button
              type="button"
              onClick={() => setView('map')}
              className={`px-6 py-2.5 text-sm font-bree rounded-xl transition-all duration-200 ${
                view === 'map' 
                  ? 'text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={view === 'map' ? { backgroundColor: '#0086C0' } : {}}
            >
              Mapa
            </button>
          </div>
        </div>

        {/* LIST VIEW */}
        {view === 'list' && (
          <>
            {featured.length === 0 ? (
              <div className="text-center py-16 rounded-3xl" style={{ backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1' }}>
                <p className="font-tequilla text-slate-600 text-lg">
                  Aún no hay paquetes activos. Crea algunos en <strong>Admin → Gestión de Paquetes</strong>.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featured.map((pkg) => (
                  <a
                    key={pkg._id}
                    href={`/packages/${pkg.slug}`}
                    className="card-hover group block bg-white rounded-2xl overflow-hidden shadow-md"
                  >
                    {/* Image Container */}
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={pkg.media?.[0]?.url}
                        alt={pkg.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 gradient-overlay"></div>
                      
                      {/* City Badge */}
                      {pkg.city && (
                        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg">
                          <MapPin size={14} style={{ color: '#0086C0' }} />
                          <span className="font-bree text-sm" style={{ color: '#0E374A' }}>
                            {pkg.city}
                          </span>
                        </div>
                      )}

                      {/* Duration Badge */}
                      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full" style={{ backgroundColor: '#0E374A' }}>
                        <span className="font-bree text-xs text-white">
                          {pkg.nights || Math.floor(pkg.durationHours / 24)} DÍAS / {pkg.nights || Math.floor(pkg.durationHours / 24) - 1} NOCHES
                        </span>
                      </div>

                      {/* Discount Badge */}
                      {pkg.discount && (
                        <div className="absolute bottom-4 left-4 badge-offer px-3 py-1.5 rounded-full">
                          <span className="font-bree text-xs text-white">
                            Ahorras S/.{pkg.discount}
                          </span>
                        </div>
                      )}

                      {/* Rating */}
                      {pkg.rating && (
                        <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ backgroundColor: '#A3B117' }}>
                          <Star size={12} fill="white" color="white" />
                          <span className="font-bree text-sm text-white">{pkg.rating}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="mb-2">
                        <span className="font-tequilla text-xs uppercase tracking-wide" style={{ color: '#0086C0' }}>
                          PAQUETE
                        </span>
                      </div>
                      
                      <h3 className="font-bree text-xl mb-2 line-clamp-2 group-hover:underline" style={{ color: '#0E374A' }}>
                        {pkg.title}
                      </h3>
                      
                      <p className="font-tequilla text-sm text-slate-600 mb-4 line-clamp-1">
                        Partiendo desde Lima • {pkg.description}
                      </p>

                      {/* Price Section */}
                      <div className="flex items-end justify-between pt-4 border-t border-slate-100">
                        <div>
                          <p className="font-tequilla text-xs text-slate-500 mb-1">
                            Precio final por persona
                          </p>
                          <div className="flex items-baseline gap-1">
                            <span className="font-bree text-2xl" style={{ color: '#0086C0' }}>
                              {pkg.currency}
                            </span>
                            <span className="font-bree text-3xl" style={{ color: '#0E374A' }}>
                              {pkg.price}
                            </span>
                          </div>
                          <p className="font-tequilla text-xs text-slate-400 mt-0.5">
                            Incluye impuestos, tasas y cargos
                          </p>
                        </div>
                        
                        <div className="p-2 rounded-full transition-colors" style={{ backgroundColor: '#f1f5f9' }}>
                          <ChevronRight size={20} style={{ color: '#0086C0' }} />
                        </div>
                      </div>

                      {/* Offer Badge */}
                      {pkg.discount && (
                        <div className="mt-3 px-3 py-1 rounded-lg inline-block" style={{ backgroundColor: '#A3B117' }}>
                          <span className="font-bree text-xs text-white">
                            Oferta Imbatible
                          </span>
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* View All Link */}
            <div className="mt-12 text-center">
              <a
                href="/packages"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bree text-lg text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: '#0086C0' }}
              >
                Ver todos los paquetes
                <ChevronRight size={20} />
              </a>
            </div>
          </>
        )}

        {/* MAP VIEW */}
        {view === 'map' && (
          <div className="rounded-3xl overflow-hidden shadow-xl border-2" style={{ borderColor: '#e2e8f0' }}>
            <div className="h-[600px] w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <div className="text-center">
                <MapPin size={48} className="mx-auto mb-4" style={{ color: '#0086C0' }} />
                <p className="font-bree text-xl mb-2" style={{ color: '#0E374A' }}>
                  Vista de Mapa
                </p>
                <p className="font-tequilla text-slate-600">
                  Aquí se mostraría el componente PackagesMap
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}