'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Compass, ChevronRight, ArrowRight,
  Waves, Trees, Sun
} from 'lucide-react';

export default function HeroLanding() {
  const params = useParams();
  const locale = params?.locale || 'es';
  const [messages, setMessages] = useState({});
  const [activeCategory, setActiveCategory] = useState('sierra');
  const [hoveredHighlight, setHoveredHighlight] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    async function loadMessages() {
      try {
        const mod = await import(`@/messages/${locale}.json`);
        setMessages(mod.default?.HeroLanding || {});
      } catch (error) {
        console.error(`Failed to load messages for locale: ${locale}`, error);
      }
    }
    loadMessages();
  }, [locale]);

  const t = (key, fallback = "") => {
    const parts = key.split(".");
    let value = messages;
    for (const part of parts) {
      value = value?.[part];
    }
    return typeof value === "string" ? value : fallback;
  };

  const categories = [
    { 
      id: 'sierra', 
      name: t('sierra.name', 'SIERRA'),
      subtitle: t('sierra.subtitle', 'Cumbres & Tradición'),
      icon: <img src="/brand/sierra.png" alt="Sierra" className="w-full h-full object-contain" />,
      color: '#0E374A',
      gradient: 'from-[#0E374A] via-[#0086C0] to-[#0E374A]',
      accentColor: 'text-[#0E374A]',
      images: [
        '/brand/urus.JPG',
        '/brand/qalasaya.JPG',
        '/brand/pukara.JPG',
        '/brand/urus3.JPG'
      ]
    },
    { 
      id: 'costa', 
      name: t('costa.name', 'COSTA'),
      subtitle: t('costa.subtitle', 'Olas & Arena'),
      icon: <img src="/brand/costa.png" alt="Costa" className="w-full h-full object-contain" />,
      color: '#0086C0',
      gradient: 'from-[#0086C0] via-[#A3B117] to-[#0086C0]',
      accentColor: 'text-[#0086C0]',
      images: [
        '/brand/Máncora – Piura.webp',
        '/brand/Máncora – Piura2.webp',
        '/brand/Punta Sal – Tumbes.webp',
        '/brand/Islas Ballestas.webp',
        '/brand/Paracas – Reserva Nacional.webp'
      ]
    },
    { 
      id: 'selva', 
      name: t('selva.name', 'SELVA'),
      subtitle: t('selva.subtitle', 'Verde & Vida'),
      icon: <img src="/brand/selva.png" alt="Selva" className="w-full h-full object-contain" />,
      color: '#A3B117',
      gradient: 'from-[#A3B117] via-[#0E374A] to-[#A3B117]',
      accentColor: 'text-[#A3B117]',
      images: [
        '/brand/Catarata amazónica – Región San Martín (Tarapoto).webp',
        '/brand/Río amazónico con bungalows – Iquitos (Loreto).webp',
        '/brand/Mirador en la copa de los árboles – Reserva Nacional Tambopata (Madre de Dios).webp',
        '/brand/parque.webp',
        '/brand/temploblanco.JPG',
        '/brand/urus2.JPG',
        '/brand/urus4.JPG'
      ]
    },
  ];

  const categoryContent = {
    sierra: {
      title: t('sierra.title', 'CORDILLERA ANDINA'),
      subtitle: t('sierra.subtitle2', 'Donde las tradiciones tocan el cielo'),
      highlights: [
        { 
          name: t('sierra.highlights.urus.name', 'Islas Flotantes'),
          description: t('sierra.highlights.urus.description', 'Comunidad Uru en el Lago Titicaca'),
          icon: <img src="/brand/urus.JPG" alt="Uros" className="w-7 h-7 md:w-8 md:h-8 object-cover rounded-lg" />,
          color: '#0E374A',
          image: '/brand/urus.JPG'
        },
        { 
          name: t('sierra.highlights.crafts.name', 'Arte Textil'),
          description: t('sierra.highlights.crafts.description', 'Tejidos ancestrales en lana de alpaca'),
          icon: <img src="/brand/urus3.JPG" alt="Textiles" className="w-7 h-7 md:w-8 md:h-8 object-cover rounded-lg" />,
          color: '#A3B117',
          image: '/brand/urus3.JPG'
        },
        { 
          name: t('sierra.highlights.textiles.name', 'Arquitectura Inca'),
          description: t('sierra.highlights.textiles.description', 'Sitios arqueológicos milenarios'),
          icon: <img src="/brand/pukara.JPG" alt="Arquitectura" className="w-7 h-7 md:w-8 md:h-8 object-cover rounded-lg" />,
          color: '#0086C0',
          image: '/brand/pukara.JPG'
        }
      ],
      stats: [
        { 
          value: '3800m', 
          label: t('sierra.stats.altitude', 'Altitud Promedio'), 
          icon: <img src="/brand/sierra.png" alt="Sierra" className="w-3 h-3 md:w-4 md:h-4 object-contain" />
        },
        { 
          value: '500+', 
          label: t('sierra.stats.routes', 'Rutas Andinas'), 
          icon: <Compass className="w-3 h-3 md:w-4 md:h-4" />
        },
        { 
          value: '15', 
          label: t('sierra.stats.communities', 'Comunidades'), 
          icon: <img src="/brand/urus.JPG" alt="Comunidad" className="w-3 h-3 md:w-4 md:h-4 object-cover rounded" />
        }
      ]
    },
    costa: {
      title: t('costa.title', 'COSTA PACÍFICA'),
      subtitle: t('costa.subtitle2', 'Donde el desierto encuentra el mar'),
      highlights: [
        { 
          name: t('costa.highlights.manchora.name', 'Máncora - Piura'),
          description: t('costa.highlights.manchora.description', 'Playa tropical con las mejores olas para surf'),
          icon: <img src="/brand/Máncora – Piura.webp" alt="Máncora" className="w-7 h-7 md:w-8 md:h-8 object-cover rounded-lg" />,
          color: '#0086C0',
          image: '/brand/Máncora – Piura.webp'
        },
        { 
          name: t('costa.highlights.puntasal.name', 'Punta Sal - Tumbes'),
          description: t('costa.highlights.puntasal.description', 'Paraíso tropical con aguas cálidas y arena blanca'),
          icon: <img src="/brand/Punta Sal – Tumbes.webp" alt="Punta Sal" className="w-7 h-7 md:w-8 md:h-8 object-cover rounded-lg" />,
          color: '#A3B117',
          image: '/brand/Punta Sal – Tumbes.webp'
        },
        { 
          name: t('costa.highlights.ballestas.name', 'Islas Ballestas'),
          description: t('costa.highlights.ballestas.description', 'Galápagos peruano con pingüinos y lobos marinos'),
          icon: <img src="/brand/Islas Ballestas.webp" alt="Islas Ballestas" className="w-7 h-7 md:w-8 md:h-8 object-cover rounded-lg" />,
          color: '#0E374A',
          image: '/brand/Islas Ballestas.webp'
        },
        { 
          name: t('costa.highlights.paracas.name', 'Paracas'),
          description: t('costa.highlights.paracas.description', 'Reserva Nacional con acantilados y vida marina'),
          icon: <img src="/brand/Paracas – Reserva Nacional.webp" alt="Paracas" className="w-7 h-7 md:w-8 md:h-8 object-cover rounded-lg" />,
          color: '#0086C0',
          image: '/brand/Paracas – Reserva Nacional.webp'
        }
      ],
      stats: [
        { 
          value: '3000km', 
          label: t('costa.stats.coastline', 'Línea Costera'), 
          icon: <img src="/brand/costa.png" alt="Costa" className="w-3 h-3 md:w-4 md:h-4 object-contain" />
        },
        { 
          value: '25°C', 
          label: t('costa.stats.temperature', 'Temperatura Media'), 
          icon: <Sun className="w-3 h-3 md:w-4 md:h-4" />
        },
        { 
          value: '50+', 
          label: t('costa.stats.beaches', 'Playas'), 
          icon: <Waves className="w-3 h-3 md:w-4 md:h-4" />
        }
      ]
    },
    selva: {
      title: t('selva.title', 'AMAZONÍA PERUANA'),
      subtitle: t('selva.subtitle2', 'Biodiversidad en su máximo esplendor'),
      highlights: [
        { 
          name: t('selva.highlights.tarapoto.name', 'Catarata Amazónica'),
          description: t('selva.highlights.tarapoto.description', 'Cascadas en la selva de Tarapoto, San Martín'),
          icon: <img src="/brand/Catarata amazónica – Región San Martín (Tarapoto).webp" alt="Catarata Tarapoto" className="w-7 h-7 md:w-8 md:h-8 object-cover rounded-lg" />,
          color: '#A3B117',
          image: '/brand/Catarata amazónica – Región San Martín (Tarapoto).webp'
        },
        { 
          name: t('selva.highlights.iquitos.name', 'Río Amazonas - Iquitos'),
          description: t('selva.highlights.iquitos.description', 'Bungalows frente al río más caudaloso del mundo'),
          icon: <img src="/brand/Río amazónico con bungalows – Iquitos (Loreto).webp" alt="Iquitos Bungalows" className="w-7 h-7 md:w-8 md:h-8 object-cover rounded-lg" />,
          color: '#0086C0',
          image: '/brand/Río amazónico con bungalows – Iquitos (Loreto).webp'
        },
        { 
          name: t('selva.highlights.tambopata.name', 'Reserva Tambopata'),
          description: t('selva.highlights.tambopata.description', 'Mirador en la copa de los árboles - Madre de Dios'),
          icon: <img src="/brand/Mirador en la copa de los árboles – Reserva Nacional Tambopata (Madre de Dios).webp" alt="Mirador Tambopata" className="w-7 h-7 md:w-8 md:h-8 object-cover rounded-lg" />,
          color: '#0E374A',
          image: '/brand/Mirador en la copa de los árboles – Reserva Nacional Tambopata (Madre de Dios).webp'
        },
        { 
          name: t('selva.highlights.manu.name', 'Parque Nacional Manu'),
          description: t('selva.highlights.manu.description', 'Navegación por ríos selváticos en Tambopata'),
          icon: <img src="/brand/parque.webp" alt="Navegación Manu" className="w-7 h-7 md:w-8 md:h-8 object-cover rounded-lg" />,
          color: '#A3B117',
          image: '/brand/parque.webp'
        }
      ],
      stats: [
        { 
          value: '60%', 
          label: t('selva.stats.territory', 'Territorio Nacional'), 
          icon: <img src="/brand/selva.png" alt="Selva" className="w-3 h-3 md:w-4 md:h-4 object-contain" />
        },
        { 
          value: '5000+', 
          label: t('selva.stats.species', 'Especies Únicas'), 
          icon: <Trees className="w-3 h-3 md:w-4 md:h-4" />
        },
        { 
          value: '28°C', 
          label: t('selva.stats.temperature', 'Temperatura Media'), 
          icon: <Sun className="w-3 h-3 md:w-4 md:h-4" />
        }
      ]
    }
  };

  const currentCategory = categories.find(cat => cat.id === activeCategory);
  const currentContent = categoryContent[activeCategory];

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAnimating) {
        setIsTransitioning(true);
        setTimeout(() => {
          setActiveImageIndex((prev) => (prev + 1) % currentCategory.images.length);
          setIsTransitioning(false);
        }, 300);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeCategory, isAnimating, currentCategory]);

  const handleCategoryChange = (categoryId) => {
    setIsAnimating(true);
    setActiveCategory(categoryId);
    setActiveImageIndex(0);
    setTimeout(() => setIsAnimating(false), 600);
  };

  return (
    <main className="relative bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-48 h-48 md:w-96 md:h-96 bg-gradient-to-br from-[#0E374A]/5 to-transparent rounded-full blur-xl md:blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 md:w-96 md:h-96 bg-gradient-to-tl from-[#0086C0]/5 to-transparent rounded-full blur-xl md:blur-3xl"></div>
      </div>

      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-3">
            <div className="flex items-center space-x-1 bg-slate-100/80 backdrop-blur-sm rounded-xl md:rounded-2xl p-1 md:p-1.5 border border-slate-200/50 w-full md:w-auto overflow-x-auto">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`relative px-4 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl transition-all duration-300 flex items-center gap-2 md:gap-3 flex-shrink-0 ${
                      isActive 
                        ? `bg-gradient-to-r ${cat.gradient} text-white shadow-lg scale-105` 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white hover:scale-105'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded md:rounded-lg ${
                      isActive ? 'bg-white/20 p-1' : 'bg-slate-200 p-1'
                    }`}>
                      {cat.icon}
                    </div>
                    <div className="text-left hidden sm:block">
                      <div className="font-bold text-xs md:text-sm tracking-wider">{cat.name}</div>
                      <div className={`text-xs ${isActive ? 'text-white/90' : 'text-slate-500'}`}>
                        {cat.subtitle}
                      </div>
                    </div>
                    <div className="text-left sm:hidden">
                      <div className="font-bold text-xs">{cat.name}</div>
                    </div>
                    {isActive && (
                      <div className="absolute inset-0 rounded-lg md:rounded-xl border-2 border-white/30"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      <section className="relative py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="relative">
              <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-br from-[#0E374A]/10 via-transparent to-[#A3B117]/10 rounded-xl md:rounded-3xl blur-lg md:blur-xl"></div>
              
              <div className="relative rounded-xl md:rounded-2xl overflow-hidden shadow-xl md:shadow-2xl border border-slate-200/50">
                <div className="relative h-64 md:h-[400px] lg:h-[500px]">
                  <Image
                    src={currentCategory.images[activeImageIndex]}
                    alt={currentContent.title}
                    fill
                    className={`object-cover transition-all duration-500 ${
                      isTransitioning ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
                    }`}
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0E374A]/70 via-transparent to-transparent"></div>
                  
                  <div className="absolute bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 flex gap-1 md:gap-2">
                    {currentCategory.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setIsTransitioning(true);
                          setTimeout(() => {
                            setActiveImageIndex(idx);
                            setIsTransitioning(false);
                          }, 300);
                        }}
                        className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-300 ${
                          idx === activeImageIndex 
                            ? 'bg-white w-6 md:w-8' 
                            : 'bg-white/50 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="absolute top-4 md:top-6 left-4 md:left-6 flex flex-wrap gap-2 md:gap-3">
                  {currentContent.stats.map((stat, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 md:px-4 md:py-2.5 bg-white/95 backdrop-blur-sm rounded-lg md:rounded-xl shadow-md md:shadow-lg flex items-center gap-2"
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        <div className="text-slate-600">{stat.icon}</div>
                        <div>
                          <div className="font-bold text-xs md:text-sm text-[#0E374A]">{stat.value}</div>
                          <div className="text-[10px] md:text-xs text-slate-500">{stat.label}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="absolute bottom-4 md:bottom-6 right-4 md:right-6 left-4 md:left-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                    {currentContent.highlights.map((highlight, idx) => (
                      <div 
                        key={idx} 
                        className="relative group"
                        onMouseEnter={() => setHoveredHighlight(highlight)}
                        onMouseLeave={() => setHoveredHighlight(null)}
                      >
                        <button
                          className={`relative p-3 md:p-4 rounded-lg md:rounded-xl backdrop-blur-md transition-all duration-300 hover:scale-105 w-full ${
                            hoveredHighlight?.name === highlight.name
                              ? 'bg-white shadow-lg md:shadow-xl scale-105'
                              : 'bg-white/90 hover:bg-white shadow-sm md:shadow-md'
                          }`}
                        >
                          <div className="flex items-center gap-2 md:gap-3">
                            {highlight.icon}
                            <div className="text-left">
                              <div className="font-bold text-xs md:text-sm text-slate-900">{highlight.name}</div>
                              <div className="text-[10px] md:text-xs text-slate-600 hidden sm:block">
                                {highlight.description}
                              </div>
                            </div>
                          </div>
                        </button>

                        <div className={`hidden md:block fixed z-[9999] inset-0 pointer-events-none transition-all duration-200 ${
                          hoveredHighlight?.name === highlight.name 
                            ? 'opacity-100 visible' 
                            : 'opacity-0 invisible'
                        }`}>
                          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-80 max-w-[90vw] bg-white rounded-xl shadow-2xl border border-slate-200 pointer-events-auto transition-all duration-200">
                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-12 border-r-12 border-t-12 border-l-transparent border-r-transparent border-t-white"></div>
                            <div className="relative h-56 w-full rounded-t-xl overflow-hidden">
                              <Image
                                src={highlight.image}
                                alt={highlight.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 320px) 100vw, 320px"
                              />
                              <button
                                onClick={() => setHoveredHighlight(null)}
                                className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                aria-label="Cerrar"
                              >
                                <span className="text-xl font-bold text-slate-700">×</span>
                              </button>
                            </div>
                            <div className="p-5">
                              <div className="font-bold text-lg text-slate-900 mb-3">{highlight.name}</div>
                              <div className="text-sm text-slate-600 leading-relaxed">{highlight.description}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute -top-2 -right-2 md:-top-4 md:-right-4 w-12 h-12 md:w-24 md:h-24 bg-gradient-to-br from-[#A3B117] to-[#0086C0] rounded-xl md:rounded-2xl rotate-12 opacity-20 blur-sm"></div>
              <div className="absolute -bottom-2 -left-2 md:-bottom-4 md:-left-4 w-10 h-10 md:w-20 md:h-20 bg-gradient-to-tr from-[#0E374A] to-[#0086C0] rounded-xl md:rounded-2xl -rotate-12 opacity-20 blur-sm"></div>
            </div>

            <div className="space-y-6 md:space-y-8 mt-8 md:mt-0">
              <div>
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-[#0E374A] via-[#0086C0] to-[#A3B117] bg-clip-text text-transparent">
                  {currentContent.title}
                </h2>
                <p className="text-base md:text-xl text-slate-600 mb-6 md:mb-8">
                  {currentContent.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {currentContent.highlights.map((highlight, idx) => (
                  <div
                    key={idx}
                    className="group p-4 bg-gradient-to-br from-white to-slate-50 rounded-lg md:rounded-xl border border-slate-200 hover:border-[#0086C0]/30 transition-all duration-300 hover:shadow-md md:hover:shadow-lg hover:scale-105"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">{highlight.icon}</div>
                      <div>
                        <div className="font-bold text-sm md:text-base text-slate-900 group-hover:text-[#0E374A] transition-colors">
                          {highlight.name}
                        </div>
                        <div className="text-xs md:text-sm text-slate-600">
                          {highlight.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 md:pt-6">
                <Link href={`/${locale}/packages?region=${activeCategory}`}>
                  <button className="group relative w-full px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-[#0E374A] via-[#0086C0] to-[#A3B117] text-white font-bold rounded-lg md:rounded-xl shadow-lg md:shadow-xl hover:shadow-xl md:hover:shadow-2xl transition-all duration-300 overflow-hidden hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#A3B117] via-[#0086C0] to-[#0E374A] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative flex items-center justify-center gap-2 md:gap-3">
                      <span className="text-sm md:text-lg">
                        {t(`${activeCategory}.cta`, `Descubrir ${currentContent.title}`)}
                      </span>
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 md:group-hover:translate-x-2 transition-transform" />
                    </div>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12 lg:py-16 bg-gradient-to-b from-white to-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h3 className="text-xl md:text-3xl font-bold text-slate-900 mb-3 md:mb-4">
              {t('gallery.title', 'Galería Visual')}
            </h3>
            <p className="text-sm md:text-base text-slate-600 max-w-xl mx-auto">
              {t('gallery.subtitle', 'Explora la belleza peruana a través de nuestras imágenes')}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {currentCategory.images.map((image, idx) => (
              <div
                key={idx}
                className="relative group overflow-hidden rounded-lg md:rounded-2xl shadow-md md:shadow-lg hover:shadow-lg md:hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                <div className="relative h-40 md:h-48 lg:h-64">
                  <Image
                    src={image}
                    alt={`${currentContent.title} ${idx + 1}`}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500 md:duration-700"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <div className="text-white font-medium text-sm md:text-base">
                      {currentContent.title}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 md:py-8 lg:py-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0E374A] via-[#0086C0] to-[#0E374A]"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 md:mb-6">
              {t('finalCta.title', 'Tu viaje inolvidable comienza aquí')}
            </h3>
            <p className="text-sm md:text-base text-white/90 mb-8 md:mb-12 max-w-2xl md:max-w-3xl mx-auto">
              {t('finalCta.description', 'Descubre la magia del Perú con experiencias personalizadas y guías expertos')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <Link href={`/${locale}/packages`}>
                <button className="px-6 py-3 md:px-8 md:py-4 bg-white text-[#0E374A] font-bold rounded-lg md:rounded-xl shadow-lg md:shadow-2xl hover:shadow-xl md:hover:shadow-3xl transition-all duration-300 flex items-center gap-2 md:gap-3 group hover:scale-105">
                  <Compass className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-sm md:text-base">{t('finalCta.btnPackages', 'Ver Paquetes')}</span>
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              
              <Link href={`/${locale}/contact`}>
                <button className="px-6 py-3 md:px-8 md:py-4 border-2 border-white text-white font-bold rounded-lg md:rounded-xl hover:bg-white/10 transition-all duration-300 flex items-center gap-2 md:gap-3 group hover:scale-105">
                  <img 
                    src="/brand/logo.png" 
                    alt="Logo" 
                    className="w-4 h-4 md:w-5 md:h-5 object-contain"
                  />
                  <span className="text-sm md:text-base">{t('finalCta.btnContact', 'Contactar Asesor')}</span>
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute top-10 left-10 w-16 h-16 md:w-20 md:h-20 bg-white/10 rounded-full blur-lg md:blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 md:w-32 md:h-32 bg-white/5 rounded-full blur-lg md:blur-xl"></div>
      </section>
    </main>
  );
}