<<<<<<< HEAD
'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { SITE_URL } from '@/app/lib/config';
import Image from 'next/image';
import {
  ArrowRight, ChevronRight, Globe as GlobeIcon,
  Compass, CheckCircle
} from 'lucide-react';
import { usePathname } from 'next/navigation';

// ========== FUNCIONES DE TRADUCCIÓN ==========
async function loadMessages(locale) {
  try {
    const mod = await import(`@/messages/${locale}.json`);
    return mod.default?.About || {};
  } catch {
    console.warn(`⚠️ Missing translations for locale "${locale}"`);
    return {};
  }
}

const tr = (dict, key, fallback) => {
  if (key.includes('.')) {
    const keys = key.split('.');
    let value = dict;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    return value ?? (fallback ?? key);
  }
  return dict?.[key] ?? (fallback ?? key);
};
// ========== FIN FUNCIONES DE TRADUCCIÓN ==========

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'Vicuña Adventures';
const ADDRESS = process.env.NEXT_PUBLIC_ADDRESS || 'Av. Circunvalación 755, Puno, Peru';
const PHONE = '+51 982 397 386';
const EMAIL = process.env.NEXT_PUBLIC_EMAIL_SALES || 'contact@vicuadvent.com';

const FB = process.env.NEXT_PUBLIC_FACEBOOK_URL || '';
const IG = process.env.NEXT_PUBLIC_INSTAGRAM_URL || '';
const LI = process.env.NEXT_PUBLIC_LINKEDIN_URL || '';

const LOCALES = ['es', 'en', 'fr', 'pt', 'ru'];
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'es';

const normalizeBase = (u = '') => u.replace(/\/+$/, '');
const base = normalizeBase(SITE_URL || 'http://localhost:3000');
const canonical = `${base}/about`;

function toTelHref(n = '') {
  return `tel:${String(n).replace(/[^\d+]/g, '')}`;
}

function sameAsList() {
  return [FB, IG, LI].filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u));
}

function parseAddress(addr = '') {
  const country = /peru/i.test(addr) ? 'PE' : undefined;
  return {
    '@type': 'PostalAddress',
    streetAddress: addr,
    addressCountry: country,
  };
}

// Componente de imagen de vicuña personalizado
const VicunaImage = ({ image = "vicuna1.png", size = 64, color = "#0086C0", className = "", animated = false }) => (
  <div className={`relative group ${className}`}>
    <div className="absolute -inset-2 bg-gradient-to-br from-[#0086C0] to-[#A3B117] opacity-20 rounded-full blur-sm group-hover:opacity-40 transition-all duration-300"></div>
    <div className="relative p-2 rounded-full bg-gradient-to-br from-white to-slate-50 shadow-inner border border-slate-100">
      <div className={`relative ${animated ? 'animate-float-slow' : ''}`} style={{ width: size, height: size }}>
        <Image
          src={`/brand/${image}`}
          alt="Vicuña"
          fill
          className="object-contain"
          style={{ filter: `drop-shadow(0 2px 4px ${color}30)` }}
        />
      </div>
    </div>
  </div>
);

export default function AboutPage() {
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [messages, setMessages] = useState({});
  const [scrolled, setScrolled] = useState(false);
  const [currentVicunaImage, setCurrentVicunaImage] = useState(0);
  const vicunaImages = ['vicuna1.png', 'vicuna2.png', 'vicuna4.png', 'vicuna5.png', 'vicunaa3.png'];
  const pathname = usePathname();

  const extractLocaleFromPath = (path) => {
    const pathSegments = path.split('/').filter(Boolean);
    if (pathSegments.length > 0 && LOCALES.includes(pathSegments[0])) {
      return pathSegments[0];
    }
    return DEFAULT_LOCALE;
  };

  useEffect(() => {
    const detectedLocale = extractLocaleFromPath(pathname);
    setLocale(detectedLocale);
    loadMessages(detectedLocale).then(setMessages);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    
    const interval = setInterval(() => {
      setCurrentVicunaImage((prev) => (prev + 1) % vicunaImages.length);
    }, 4000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  const t = (key, fallback) => tr(messages, key, fallback);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND,
    url: base,
    description: 'Vicuña Adventures es una agencia de turismo especializada en experiencias vivenciales en los Andes, promoviendo turismo sostenible y comunitario.',
    address: parseAddress(ADDRESS),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: PHONE,
        email: EMAIL,
        contactType: 'customer support',
        areaServed: 'PE',
        availableLanguage: LOCALES,
      },
    ],
    numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 10 },
    sameAs: sameAsList(),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      
      <main className="bg-white min-h-screen overflow-hidden">
        
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur-sm'
        }`}>
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between h-20">
              <Link href={`/${locale}`} className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="relative w-10 h-10 animate-float-slow">
                    <Image
                      src="/brand/vicunaa3.png"
                      alt="Logo Vicuña Adventures"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#0086C0] rounded-full"></div>
                </div>
                <div>
                  <span className="block text-[#A3B117] font-bold text-xl tracking-tight" style={{fontFamily: "'Bree Serif', serif"}}>
                    VICUÑA
                  </span>
                  <span className="block text-[#0086C0] text-xs font-semibold tracking-wider" style={{fontFamily: "'Bree Serif', serif"}}>
                    Adventures
                  </span>
                </div>
              </Link>

              <div className="hidden md:flex items-center gap-8">
                <Link href={`/${locale}`} className="text-[#64748B] hover:text-[#A3B117] transition font-medium flex items-center gap-2 group" style={{fontFamily: "'Bree Serif', serif"}}>
                  <div className="w-1 h-1 bg-[#A3B117] rounded-full opacity-0 group-hover:opacity-100 transition"></div>
                  {t('nav.home', 'Inicio')}
                </Link>
                <Link href={`/${locale}/packages`} className="text-[#64748B] hover:text-[#A3B117] transition font-medium flex items-center gap-2 group" style={{fontFamily: "'Bree Serif', serif"}}>
                  <div className="w-1 h-1 bg-[#A3B117] rounded-full opacity-0 group-hover:opacity-100 transition"></div>
                  {t('nav.packages', 'Paquetes')}
                </Link>
                <Link href={`/${locale}/destinations`} className="text-[#64748B] hover:text-[#A3B117] transition font-medium flex items-center gap-2 group" style={{fontFamily: "'Bree Serif', serif"}}>
                  <div className="w-1 h-1 bg-[#A3B117] rounded-full opacity-0 group-hover:opacity-100 transition"></div>
                  {t('nav.destinations', 'Destinos')}
                </Link>
                <Link href={`/${locale}/about`} className="text-[#A3B117] font-semibold border-b-2 border-[#A3B117] flex items-center gap-2" style={{fontFamily: "'Bree Serif', serif"}}>
                  <div className="w-1.5 h-1.5 bg-[#A3B117] rounded-full"></div>
                  {t('nav.about', 'Nosotros')}
                </Link>
                <Link href={`/${locale}/testimonials`} className="text-[#64748B] hover:text-[#A3B117] transition font-medium flex items-center gap-2 group" style={{fontFamily: "'Bree Serif', serif"}}>
                  <div className="w-1 h-1 bg-[#A3B117] rounded-full opacity-0 group-hover:opacity-100 transition"></div>
                  {t('nav.testimonials', 'Testimonios')}
                </Link>
                <Link href={`/${locale}/contact`} className="text-[#64748B] hover:text-[#A3B117] transition font-medium flex items-center gap-2 group" style={{fontFamily: "'Bree Serif', serif"}}>
                  <div className="w-1 h-1 bg-[#A3B117] rounded-full opacity-0 group-hover:opacity-100 transition"></div>
                  {t('nav.contact', 'Contacto')}
                </Link>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-4 py-2 text-[#0E374A] border border-slate-200 rounded-full hover:bg-slate-50 transition text-sm flex items-center gap-2 group" style={{fontFamily: "'Bree Serif', serif"}}>
                  <GlobeIcon className="w-4 h-4 text-[#0086C0] group-hover:rotate-12 transition-transform" />
                  {locale === 'es' ? 'Español' : 'English'}
                </button>
                <Link 
                  href={`/${locale}/contact`}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#0086C0] to-[#0E374A] text-white rounded-full font-semibold hover:shadow-xl hover:scale-105 transition-all shadow-lg shadow-[#0086C0]/20 flex items-center gap-2 group"
                  style={{fontFamily: "'Bree Serif', serif"}}
                >
                  <Compass className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                  {t('nav.book', 'Reservar')}
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <section className="relative min-h-screen flex items-center justify-center pt-20 bg-gradient-to-br from-[#F8FAFC] via-white to-slate-50 overflow-hidden">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-20 left-20 w-96 h-96 bg-[#0086C0]/10 rounded-full blur-3xl animate-float"></div>
            <div className="absolute top-40 right-20 w-96 h-96 bg-[#A3B117]/10 rounded-full blur-3xl animate-float-delay-2"></div>
            <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-[#0086C0]/10 rounded-full blur-3xl animate-float-delay-4"></div>
          </div>

          <div className="absolute top-20 right-10 w-56 h-56 hidden lg:block animate-float-slow">
            <div className="relative w-full h-full">
              <Image
                src="/brand/vicuna1.png"
                alt="Vicuña aventurera"
                fill
                className="object-contain opacity-90 drop-shadow-2xl"
              />
            </div>
          </div>

          <div className="container mx-auto px-6 relative z-10 text-center py-20">
            <div className="mb-8 animate-fade-in-up" style={{fontFamily: "'Bree Serif', serif"}}>
              <span className="block text-5xl md:text-7xl lg:text-8xl font-black text-[#0E374A] mb-4">
                {t('hero.weAre', 'Somos')}
              </span>
              <span className="block text-4xl md:text-5xl lg:text-7xl font-black">
                <span className="text-[#0086C0]">Vicuña</span>{' '}
                <span className="text-[#A3B117]">Adventures</span>
              </span>
            </div>
            
            <p className="text-base md:text-xl text-[#64748B] max-w-3xl mx-auto leading-relaxed mb-12 animate-fade-in-up-delay" style={{fontFamily: "'Bree Serif', serif"}}>
              {t('hero.description', 'Más que una operadora turística. Somos tu conexión local con el alma del Perú, uniendo experiencias auténticas con turismo sostenible y respetuoso.')}
            </p>

            <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up-delay-2">
              <Link 
                href={`/${locale}/contact`}
                className="group relative px-8 py-4 bg-gradient-to-r from-[#0086C0] to-[#0E374A] rounded-full font-bold text-white overflow-hidden transition-all hover:shadow-2xl hover:shadow-[#0086C0]/30 hover:scale-105 flex items-center gap-3"
                style={{fontFamily: "'Bree Serif', serif"}}
              >
                <div className="relative w-8 h-8">
                  <Image
                    src="/brand/vicuna4.png"
                    alt="Vicuña"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="relative z-10">{t('hero.startAdventure', 'Inicia tu Aventura')}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
              </Link>
              
              <button 
                className="group px-8 py-4 bg-white border-2 border-[#0086C0]/20 rounded-full font-bold text-[#0E374A] hover:bg-gradient-to-r hover:from-[#0086C0]/5 hover:to-[#A3B117]/5 hover:border-[#0086C0]/40 transition-all duration-300 flex items-center gap-3"
                style={{fontFamily: "'Bree Serif', serif"}}
              >
                <div className="relative w-8 h-8">
                  <Image
                    src="/brand/vicuna2.png"
                    alt="Vicuña"
                    fill
                    className="object-contain group-hover:scale-110 transition-transform"
                  />
                </div>
                {t('hero.watchStory', 'Mira Nuestra Historia')}
              </button>
            </div>
          </div>

          <div className="absolute bottom-10 left-10 w-40 h-40 hidden md:block animate-float-delay-3">
            <div className="relative w-full h-full">
              <Image
                src="/brand/vicuna5.png"
                alt="Vicuña exploradora"
                fill
                className="object-contain opacity-80 drop-shadow-xl"
              />
            </div>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce-slow">
            <div className="w-6 h-10 border-2 border-[#A3B117] rounded-full flex items-start justify-center p-2 bg-white shadow-lg">
              <div className="w-1.5 h-3 bg-gradient-to-b from-[#0086C0] to-[#A3B117] rounded-full animate-scroll"></div>
            </div>
          </div>
        </section>

        <section className="relative py-20 bg-white">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { 
                  value: '4+', 
                  label: t('stats.guides', 'Guías Expertos'), 
                  desc: t('stats.guidesDesc', 'Certificados y Locales'),
                  color: '#0086C0',
                  image: 'vicuna4.png'
                },
                { 
                  value: '2+', 
                  label: t('stats.drivers', 'Choferes Seguros'), 
                  desc: t('stats.driversDesc', 'Conocen Cada Ruta'),
                  color: '#A3B117',
                  image: 'vicuna5.png'
                },
                { 
                  value: '10+', 
                  label: t('stats.team', 'Miembros del Equipo'), 
                  desc: t('stats.teamDesc', 'Multilingües'),
                  color: '#0086C0',
                  image: 'vicunaa3.png'
                },
                { 
                  value: '100%', 
                  label: t('stats.cuisine', 'Cocina Local'), 
                  desc: t('stats.cuisineDesc', 'Sabores Auténticos'),
                  color: '#A3B117',
                  image: 'vicuna2.png'
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="group text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-current/30 transition-all duration-500 hover:scale-105 hover:-translate-y-2 relative overflow-hidden"
                  style={{ borderColor: `${stat.color}20` }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                    <div className="relative w-full h-full">
                      <Image
                        src={`/brand/${stat.image}`}
                        alt=""
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>

                  <div className="flex justify-center mb-4">
                    <div className="p-2 rounded-full bg-gradient-to-br from-white to-slate-50 border border-slate-200 group-hover:border-current/30 transition-colors relative z-10">
                      <div className="relative w-16 h-16">
                        <Image
                          src={`/brand/${stat.image}`}
                          alt={stat.label}
                          fill
                          className="object-contain group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-[#0086C0] to-[#A3B117] bg-clip-text text-transparent mb-2 relative z-10" style={{fontFamily: "'Bree Serif', serif"}}>
                    {stat.value}
                  </div>
                  <div className="text-lg font-bold text-[#0E374A] mb-1 relative z-10" style={{fontFamily: "'Bree Serif', serif"}}>
                    {stat.label}
                  </div>
                  <div className="text-sm text-[#64748B] relative z-10" style={{fontFamily: "'Bree Serif', serif"}}>{stat.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative md:py-28  py-18 bg-gradient-to-b from-white to-[#F8FAFC] overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8 relative z-10">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-[#A3B117]/10 to-[#0086C0]/5 border border-[#A3B117]/20 px-4 py-2 rounded-full">
                  <div className="relative w-5 h-5">
                    <Image
                      src="/brand/vicuna1.png"
                      alt=""
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="text-[#A3B117] text-sm font-bold tracking-widest" style={{fontFamily: "'Bree Serif', serif"}}>
                    {t('mission.title', 'NUESTRA MISIÓN')}
                  </span>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-black text-[#0E374A] leading-tight" style={{fontFamily: "'Bree Serif', serif"}}>
                  {t('mission.headline1', 'Compartir la')}{' '}
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#0086C0] to-[#A3B117]">
                    {t('mission.headline2', 'Riqueza Andina')}
                  </span>
                </h2>
                
                <p className="text-base text-[#64748B] leading-relaxed" style={{fontFamily: "'Bree Serif', serif"}}>
                  {t('mission.description', 'Compartir con el mundo la riqueza cultural y natural de los Andes, ofreciendo experiencias de viaje auténticas que conecten a cada visitante con la Pachamama, las tradiciones aymaras y quechuas, y la calidez de nuestra gente. Promovemos un turismo responsable y sostenible que honre nuestras raíces y fortalezca a nuestras comunidades.')}
                </p>
                
                <div className="space-y-5">
                  {[
                    { 
                      text: t('mission.items.sustainable', 'Turismo 100% Sostenible'),
                      color: '#A3B117',
                      image: 'vicuna4.png'
                    },
                    { 
                      text: t('mission.items.reciprocity', 'Reciprocidad (Ayni) con Comunidades'),
                      color: '#0086C0',
                      image: 'vicuna5.png'
                    },
                    { 
                      text: t('mission.items.safety', 'Operaciones Seguras'),
                      color: '#A3B117',
                      image: 'vicuna2.png'
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                      <div 
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-slate-50 border border-slate-200 flex items-center justify-center group-hover:scale-110 transition-all duration-300 group-hover:border-current/40"
                        style={{ borderColor: `${item.color}30` }}
                      >
                        <div className="relative w-8 h-8">
                          <Image
                            src={`/brand/${item.image}`}
                            alt=""
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                      <span className="text-lg font-bold text-[#0E374A]" style={{fontFamily: "'Bree Serif', serif"}}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border-2 border-[#0086C0]/20 bg-gradient-to-br from-[#0086C0]/5 to-[#A3B117]/5 shadow-2xl">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-full h-full">
                      <Image
                        src={`/brand/${vicunaImages[currentVicunaImage]}`}
                        alt="Vicuña animada"
                        fill
                        className="object-contain transition-all duration-1000"
                        style={{ opacity: 0.9 }}
                      />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0086C0]/10 to-[#A3B117]/10"></div>
                </div>
                <div className="absolute -bottom-8 -right-8 w-72 h-72 bg-[#A3B117]/10 rounded-full blur-3xl"></div>
                <div className="absolute -top-8 -left-8 w-72 h-72 bg-[#0086C0]/10 rounded-full blur-3xl"></div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-28 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-[#0086C0]/5 to-[#A3B117]/5 px-6 py-2 rounded-full mb-6 border border-[#0086C0]/10">
                <div className="relative w-5 h-5">
                  <Image
                    src="/brand/vicuna2.png"
                    alt=""
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="font-semibold text-sm tracking-widest uppercase text-[#0086C0]" style={{fontFamily: "'Bree Serif', serif"}}>
                  {t('vision.title', 'NUESTRA VISIÓN')}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-[#0E374A] mb-6" style={{fontFamily: "'Bree Serif', serif"}}>
                {t('vision.headline1', 'Ser referencia en')}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#0086C0] to-[#A3B117]">
                  {t('vision.headline2', 'Turismo Andino')}
                </span>
              </h2>
              <p className="text-base text-[#64748B] max-w-2xl mx-auto" style={{fontFamily: "'Bree Serif', serif"}}>
                {t('vision.description', 'Ser una agencia referente en turismo vivencial y de aventura en el altiplano andino, reconocida por rescatar y difundir el legado cultural aymara y quechua, promoviendo un equilibrio entre el viajero, la naturaleza y nuestras costumbres ancestrales.')}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-auto">
              <div className="lg:col-span-2 group relative bg-white border border-slate-100 rounded-3xl p-8 hover:shadow-xl hover:border-[#0086C0]/30 transition-all duration-500 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#0086C0]/5 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                <div className="absolute bottom-4 left-4 w-24 h-24 opacity-20 group-hover:opacity-30 transition-opacity duration-500">
                  <div className="relative w-full h-full">
                    <Image
                      src="/brand/vicuna1.png"
                      alt=""
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex justify-center mb-6">
                    <VicunaImage 
                      image="vicuna4.png"
                      size={48}
                      color="#0086C0"
                      className="scale-125"
                    />
                  </div>
                  <h3 className="text-3xl font-black text-[#0E374A] mb-4 text-center" style={{fontFamily: "'Bree Serif', serif"}}>
                    {t('vision.card1.title', 'Equilibrio Perfecto')}
                  </h3>
                  <p className="text-[#64748B] text-base mb-8 leading-relaxed max-w-2xl mx-auto text-center" style={{fontFamily: "'Bree Serif', serif"}}>
                    {t('vision.card1.description', 'Promovemos un equilibrio entre el viajero, la naturaleza y nuestras costumbres ancestrales, creando experiencias que respetan la Pachamama y enriquecen al visitante.')}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      t('vision.card1.items.ancestralRespect', 'Respeto Ancestral'),
                      t('vision.card1.items.naturalHarmony', 'Armonía Natural'),
                      t('vision.card1.items.culturalConnection', 'Conexión Cultural'),
                      t('vision.card1.items.sustainableDevelopment', 'Desarrollo Sostenible')
                    ].map((f, i) => (
                      <div key={i} className="flex items-center gap-3 text-[#A3B117] justify-center">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#A3B117]/20 to-[#0086C0]/20 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-[#A3B117]" />
                        </div>
                        <span className="font-bold text-sm" style={{fontFamily: "'Bree Serif', serif"}}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:row-span-2 group relative bg-gradient-to-br from-[#A3B117]/5 to-[#0086C0]/5 border border-slate-100 rounded-3xl p-8 hover:shadow-xl hover:border-[#A3B117]/30 transition-all duration-500 overflow-hidden">
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#A3B117]/10 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                <div className="absolute top-4 right-4 w-32 h-32">
                  <div className="relative w-full h-full">
                    <Image
                      src="/brand/vicuna5.png"
                      alt="Vicuña cultural"
                      fill
                      className="object-contain opacity-80 group-hover:opacity-95 transition-opacity duration-500 drop-shadow-lg"
                    />
                  </div>
                </div>
                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex justify-center mb-6">
                    <VicunaImage 
                      image="vicunaa3.png"
                      size={48}
                      color="#A3B117"
                      className="scale-125"
                    />
                  </div>
                  <h3 className="text-3xl font-black text-[#0E374A] mb-4 text-center" style={{fontFamily: "'Bree Serif', serif"}}>
                    {t('vision.card2.title', 'Legado Cultural')}
                  </h3>
                  <p className="text-[#64748B] text-base mb-8 leading-relaxed flex-grow text-center" style={{fontFamily: "'Bree Serif', serif"}}>
                    {t('vision.card2.description', 'Reconocidos por rescatar y difundir el legado cultural aymara y quechua, posicionando al turismo como herramienta para preservar y revalorizar la identidad cultural andina.')}
                  </p>
                  <div className="space-y-4">
                    {[
                      { text: t('vision.card2.items.livingTraditions', 'Tradiciones Vivas'), color: '#A3B117', image: 'vicuna4.png' },
                      { text: t('vision.card2.items.ancestralArt', 'Arte Ancestral'), color: '#0086C0', image: 'vicuna2.png' },
                      { text: t('vision.card2.items.andeanWisdom', 'Sabiduría Andina'), color: '#A3B117', image: 'vicuna1.png' },
                    ].map((item, i) => (
                      <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-current/30 hover:shadow-md transition-all duration-300 hover:scale-105 relative z-10">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-slate-50 border flex items-center justify-center"
                            style={{ borderColor: `${item.color}30` }}
                          >
                            <div className="relative w-6 h-6">
                              <Image
                                src={`/brand/${item.image}`}
                                alt=""
                                fill
                                className="object-contain"
                              />
                            </div>
                          </div>
                          <span className="text-[#0E374A] font-semibold text-sm" style={{fontFamily: "'Bree Serif', serif"}}>
                            {item.text}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 group relative bg-white border border-slate-100 rounded-3xl p-8 hover:shadow-xl hover:border-[#0086C0]/30 transition-all duration-500 overflow-hidden">
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-[#0086C0]/5 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                <div className="relative z-10">
                  <div className="flex justify-center mb-6">
                    <VicunaImage 
                      image="vicuna2.png"
                      size={48}
                      color="#0086C0"
                      className="scale-125"
                    />
                  </div>
                  <h3 className="text-3xl font-black text-[#0E374A] mb-4 text-center" style={{fontFamily: "'Bree Serif', serif"}}>
                    {t('vision.card3.title', 'Experiencias Vivenciales')}
                  </h3>
                  <p className="text-[#64748B] text-base mb-8 max-w-2xl mx-auto text-center" style={{fontFamily: "'Bree Serif', serif"}}>
                    {t('vision.card3.description', 'Especialistas en turismo vivencial que permite al viajero sumergirse en la vida cotidiana y espiritual de las comunidades andinas.')}
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: t('vision.card3.items.authenticity', 'Autenticidad'), color: '#A3B117', image: 'vicunaa3.png' },
                      { label: t('vision.card3.items.depth', 'Profundidad'), color: '#0086C0', image: 'vicuna4.png' },
                      { label: t('vision.card3.items.transformation', 'Transformación'), color: '#A3B117', image: 'vicuna5.png' },
                    ].map((item, i) => (
                      <div key={i} className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-5 text-center border border-slate-100 hover:border-current/30 hover:shadow-md transition-all duration-300 hover:scale-105 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                          <div className="relative w-full h-full">
                            <Image
                              src={`/brand/${item.image}`}
                              alt=""
                              fill
                              className="object-contain"
                            />
                          </div>
                        </div>
                        <div className="mb-3 mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-white to-slate-100 border flex items-center justify-center relative z-10"
                          style={{ borderColor: `${item.color}30` }}
                        >
                          <div className="relative w-8 h-8">
                            <Image
                              src={`/brand/${item.image}`}
                              alt=""
                              fill
                              className="object-contain"
                            />
                          </div>
                        </div>
                        <div className="text-[#0E374A] font-bold text-sm relative z-10" style={{fontFamily: "'Bree Serif', serif"}}>
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative md:py-28 py-18  bg-gradient-to-b from-white to-[#F8FAFC]">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-[#0086C0]/5 to-[#A3B117]/5 px-6 py-2 rounded-full mb-6 border border-[#0086C0]/10">
                <div className="relative w-5 h-5">
                  <Image
                    src="/brand/vicuna4.png"
                    alt=""
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="font-semibold text-sm tracking-widest uppercase text-[#0086C0]" style={{fontFamily: "'Bree Serif', serif"}}>
                  {t('goals.title', 'NUESTROS OBJETIVOS')}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-[#0E374A] mb-6" style={{fontFamily: "'Bree Serif', serif"}}>
                {t('goals.headline1', '5 Pilares que')}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#0086C0] to-[#A3B117]">
                  {t('goals.headline2', 'Nos Guían')}
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                {
                  number: '1',
                  title: t('goals.items.integratedExperiences.title', 'Experiencias Integradas'),
                  description: t('goals.items.integratedExperiences.description', 'Diseñar experiencias que integren paisajes, historia y tradiciones andinas vivas a través de festividades, gastronomía, artesanía y convivencia con comunidades.'),
                  color: '#0086C0',
                  image: 'vicuna1.png'
                },
                {
                  number: '2',
                  title: t('goals.items.communityTourism.title', 'Turismo Comunitario'),
                  description: t('goals.items.communityTourism.description', 'Promover el turismo sostenible y comunitario en alianza con familias y comunidades locales, generando ingresos justos y sostenibles.'),
                  color: '#A3B117',
                  image: 'vicuna2.png'
                },
                {
                  number: '3',
                  title: t('goals.items.andeanWorldview.title', 'Cosmovisión Andina'),
                  description: t('goals.items.andeanWorldview.description', 'Fomentar el respeto y la valoración de la cosmovisión andina, transmitiendo valores como el ayni (reciprocidad) y la armonía con la naturaleza.'),
                  color: '#0086C0',
                  image: 'vicuna4.png'
                },
                {
                  number: '4',
                  title: t('goals.items.andeanHospitality.title', 'Hospitalidad Andina'),
                  description: t('goals.items.andeanHospitality.description', 'Ofrecer un servicio seguro, confiable y personalizado, con el sello único de la hospitalidad del altiplano.'),
                  color: '#A3B117',
                  image: 'vicuna5.png'
                },
                {
                  number: '5',
                  title: t('goals.items.regionalDevelopment.title', 'Desarrollo Regional'),
                  description: t('goals.items.regionalDevelopment.description', 'Contribuir al desarrollo económico y cultural de nuestra región, fortaleciendo el orgullo por nuestras raíces y preservando la identidad cultural.'),
                  color: '#0086C0',
                  image: 'vicunaa3.png'
                },
              ].map((goal, i) => (
                <div 
                  key={i} 
                  className="group relative bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-xl hover:border-current/30 transition-all duration-500 hover:-translate-y-1 overflow-hidden"
                  style={{ borderColor: `${goal.color}20` }}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                    <div className="relative w-full h-full">
                      <Image
                        src={`/brand/${goal.image}`}
                        alt=""
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div 
                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-white to-slate-50 border flex items-center justify-center group-hover:scale-110 transition-transform relative z-10"
                        style={{ borderColor: `${goal.color}30` }}
                      >
                        <div className="relative w-8 h-8">
                          <Image
                            src={`/brand/${goal.image}`}
                            alt=""
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-2 mb-2">
                        <span 
                          className="text-2xl font-black relative z-10"
                          style={{ 
                            background: `linear-gradient(135deg, ${goal.color}, ${goal.color === '#0086C0' ? '#0E374A' : '#A3B117'})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }}
                        >
                          {goal.number}
                        </span>
                        <h3 
                          className="text-lg font-black text-[#0E374A] relative z-10"
                          style={{fontFamily: "'Bree Serif', serif"}}
                        >
                          {goal.title}
                        </h3>
                      </div>
                      <p className="text-sm text-[#64748B] relative z-10" style={{fontFamily: "'Bree Serif', serif"}}>
                        {goal.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative py-28 bg-white overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20 ">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-[#0086C0]/5 to-[#A3B117]/5 px-6 py-2 rounded-full mb-6 border border-[#0086C0]/10">
                <div className="relative w-5 h-5">
                  <Image
                    src="/brand/vicuna5.png"
                    alt=""
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="font-semibold text-sm tracking-widest uppercase text-[#0086C0]" style={{fontFamily: "'Bree Serif', serif"}}>
                  {t('team.title', 'NUESTRO EQUIPO')}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-[#0E374A] mb-6" style={{fontFamily: "'Bree Serif', serif"}}>
                {t('team.headline1', 'Conoce al')}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#0086C0] to-[#A3B117]">
                  {t('team.headline2', 'Corazón de Vicuña')}
                </span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-xl hover:border-[#0086C0]/30 transition-all duration-500 hover:-translate-y-1 overflow-hidden group">
                <div className="absolute bottom-0 left-0 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                  <div className="relative w-full h-full">
                    <Image
                      src="/brand/vicuna4.png"
                      alt=""
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#0086C0]/20 to-[#A3B117]/10 border border-[#0086C0]/20 flex items-center justify-center relative z-10">
                    <div className="relative w-10 h-10">
                      <Image
                        src="/brand/vicuna4.png"
                        alt="Jorge Cruz"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-[#0E374A] mb-1 relative z-10" style={{fontFamily: "'Bree Serif', serif"}}>
                      {t('team.jorge.name', 'Jorge Cruz')}
                    </h3>
                    <p className="text-[#0086C0] font-bold mb-3 text-sm relative z-10" style={{fontFamily: "'Bree Serif', serif"}}>
                      {t('team.jorge.position', 'Gerente de Ventas')}
                    </p>
                    <div className="flex items-center gap-2 text-[#64748B] text-sm mb-3 relative z-10">
                      <div className="relative w-4 h-4">
                        <Image
                          src="/brand/vicuna1.png"
                          alt="Teléfono"
                          fill
                          className="object-contain"
                        />
                      </div>
                      +51 982 397 386
                    </div>
                    <p className="text-sm text-[#64748B] relative z-10" style={{fontFamily: "'Bree Serif', serif"}}>
                      {t('team.jorge.description', 'Especialista en diseñar experiencias personalizadas y asegurar que cada viajero encuentre la aventura perfecta en los Andes.')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-xl hover:border-[#A3B117]/30 transition-all duration-500 hover:-translate-y-1 overflow-hidden group">
                <div className="absolute bottom-0 right-0 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                  <div className="relative w-full h-full">
                    <Image
                      src="/brand/vicuna5.png"
                      alt=""
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#A3B117]/20 to-[#0086C0]/10 border border-[#A3B117]/20 flex items-center justify-center relative z-10">
                    <div className="relative w-10 h-10">
                      <Image
                        src="/brand/vicuna5.png"
                        alt="Jacqueline Mamani"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-[#0E374A] mb-1 relative z-10" style={{fontFamily: "'Bree Serif', serif"}}>
                      {t('team.jacqueline.name', 'Jacqueline Mamani')}
                    </h3>
                    <p className="text-[#A3B117] font-bold mb-3 text-sm relative z-10" style={{fontFamily: "'Bree Serif', serif"}}>
                      {t('team.jacqueline.position', 'Gerenta de Reservas')}
                    </p>
                    <div className="flex items-center gap-2 text-[#64748B] text-sm mb-3 relative z-10">
                      <div className="relative w-4 h-4">
                        <Image
                          src="/brand/vicuna2.png"
                          alt="Teléfono"
                          fill
                          className="object-contain"
                        />
                      </div>
                      +51 999 069 352
                    </div>
                    <p className="text-sm text-[#64748B] relative z-10" style={{fontFamily: "'Bree Serif', serif"}}>
                      {t('team.jacqueline.description', 'Se encarga de coordinar todos los detalles para que tu viaje sea perfecto, desde el alojamiento hasta las actividades especiales.')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-20 overflow-hidden bg-gradient-to-br from-[#0086C0] via-[#0086C0] to-[#0E374A]">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}></div>
          </div>

          <div className="absolute top-10 right-10 w-40 h-40 opacity-30 animate-float-slow hidden lg:block">
            <div className="relative w-full h-full">
              <Image
                src="/brand/vicuna2.png"
                alt=""
                fill
                className="object-contain"
              />
            </div>
          </div>

          <div className="absolute bottom-10 left-10 w-40 h-40 opacity-30 animate-float-delay-2 hidden lg:block">
            <div className="relative w-full h-full">
              <Image
                src="/brand/vicunaa3.png"
                alt=""
                fill
                className="object-contain"
              />
            </div>
          </div>
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="mb-10">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-6 leading-snug" style={{fontFamily: "'Bree Serif', serif"}}>
                  {t('cta.headline1', '¿Listo para')}
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#A3B117] to-[#F0F8A3]">
                    {t('cta.headline2', 'Explorar los Andes?')}
                  </span>
                </h2>
                <p className="text-base md:text-lg text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed" style={{fontFamily: "'Bree Serif', serif"}}>
                  {t('cta.description', 'Diseñamos experiencias únicas que conectan con la esencia andina')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href={`/${locale}/contact`}
                  className="group relative px-8 py-4 bg-white text-[#0E374A] rounded-full font-bold text-base md:text-base hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl min-w-[200px] flex items-center justify-center gap-3"
                  style={{fontFamily: "'Bree Serif', serif"}}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#A3B117]/0 to-[#A3B117]/0 group-hover:from-[#A3B117]/10 group-hover:to-[#0086C0]/10 transition-all duration-500"></div>
                  <div className="relative w-6 h-6">
                    <Image
                      src="/brand/vicuna4.png"
                      alt=""
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="relative flex items-center gap-2">
                    <span>{t('cta.button1', 'Planear Mi Viaje')}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                  </span>
                </Link>

                <Link
                  href={`/${locale}/packages`}
                  className="px-7 py-4 border-2 border-white/30 text-white rounded-full font-semibold text-base hover:bg-white/10 hover:border-white/50 hover:scale-105 transition-all duration-300 backdrop-blur-sm min-w-[160px] flex items-center justify-center gap-3"
                  style={{fontFamily: "'Bree Serif', serif"}}
                >
                  <div className="relative w-5 h-5">
                    <Image
                      src="/brand/vicuna5.png"
                      alt=""
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="flex items-center gap-2">
                    <span>{t('cta.button2', 'Ver Paquetes')}</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
=======
// frontend/app/about/page.js
import Link from "next/link";
import { SITE_URL } from "@/app/lib/config";

/* ------------------------------------------------------
 * 🔧 Branding & Contact
 * ------------------------------------------------------ */
const BRAND   = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
const ADDRESS = process.env.NEXT_PUBLIC_ADDRESS || "Av. Circunvalación 755, Puno, Peru";
const PHONE   = process.env.NEXT_PUBLIC_PHONE || "+51 982 397 386";
const EMAIL   = process.env.NEXT_PUBLIC_EMAIL_SALES || "contact@vicuadvent.com";

const FB = process.env.NEXT_PUBLIC_FACEBOOK_URL  || "";
const IG = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "";
const LI = process.env.NEXT_PUBLIC_LINKEDIN_URL  || "";

const LOCALES = ["es", "en"];
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "es";

const normalizeBase = (u = "") => u.replace(/\/+$/, "");
const base = normalizeBase(SITE_URL || "http://localhost:3000");
const canonical = `${base}/about`;

/* ------------------------------------------------------
 * 🧭 Helpers
 * ------------------------------------------------------ */
function toTelHref(n = "") {
  return `tel:${String(n).replace(/[^\d+]/g, "")}`;
}

function sameAsList() {
  return [FB, IG, LI].filter((u) => typeof u === "string" && /^https?:\/\//i.test(u));
}

function parseAddress(addr = "") {
  const country = /peru/i.test(addr) ? "PE" : undefined;
  return {
    "@type": "PostalAddress",
    streetAddress: addr,
    addressCountry: country,
  };
}

/* ------------------------------------------------------
 * 🌐 Metadata
 * ------------------------------------------------------ */
export const viewport = {
  title: `${BRAND} | About us`,
  description:
    `${BRAND} is a local operator with certified tour guides, drivers, translators, and cooks. We partner with hotels and native communities across Peru.`,
  openGraph: {
    title: `${BRAND} | About us`,
    description:
      `${BRAND}: responsible tourism with local alliances, safety, and 24/7 support.`,
    url: canonical,
    type: "website",
    siteName: BRAND,
  },
  alternates: {
    canonical,
    languages: {
      es: `${base}/es/about`,
      en: `${base}/en/about`,
    },
  },
};

/* ------------------------------------------------------
 * 🏕️ Page Component
 * ------------------------------------------------------ */
export default function AboutPage() {
  // Structured data
  const ld = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND,
    url: base,
    description:
      `${BRAND} operates in Peru with a team of certified tour guides, drivers, translators, and cooks, maintaining agreements with hotels and partnering with native communities.`,
    address: parseAddress(ADDRESS),
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: PHONE,
        email: EMAIL,
        contactType: "customer support",
        areaServed: "PE",
        availableLanguage: LOCALES,
      },
    ],
    numberOfEmployees: { "@type": "QuantitativeValue", minValue: 8 },
    sameAs: sameAsList(),
  };

  return (
    <main>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      {/* Breadcrumbs */}
      <div className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="container-default py-3 text-sm text-slate-600">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-slate-800 font-medium">About us</span>
        </div>
      </div>

      {/* Hero / Intro */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-slate-50 to-white" />
        <div className="container-default relative py-14 text-center max-w-3xl mx-auto">
          <span className="inline-block text-xs font-semibold tracking-wide uppercase bg-green-100 text-green-800 px-3 py-1 rounded-full">
            About {BRAND}
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900">
            Local operator, real experiences
          </h1>
          <p className="mt-4 text-slate-600 leading-relaxed">
            We’re a field-based team designing and operating authentic trips in Puno, Cusco,
            Arequipa, and throughout Peru. We work hand-in-hand with native communities and a network
            of partner hotels so you experience each destination safely, comfortably, and with respect
            for local culture.
          </p>
        </div>
      </section>

      {/* Content Sections */}
      <section className="container-default py-12 space-y-12">
        {/* Key numbers */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { title: "Tour guides", value: "4+", note: "Certified & local" },
            { title: "Drivers", value: "2", note: "Safe routes" },
            { title: "Translators", value: "Team", note: "ES · EN (and more)" },
            { title: "Cooks", value: "Team", note: "Local menus" },
          ].map((k, i) => (
            <div
              key={i}
              className="card text-center hover:shadow-lg transition-shadow duration-200"
            >
              <div className="card-body">
                <div className="text-3xl font-extrabold text-green-700">{k.value}</div>
                <div className="font-semibold text-slate-800">{k.title}</div>
                <div className="text-xs text-slate-500">{k.note}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Partnerships & agreements */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <article className="card hover:shadow-md transition-shadow duration-200">
            <div className="card-body">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                🏨 Hotel partnerships
              </h2>
              <p className="text-slate-600 mt-2 leading-relaxed">
                We maintain agreements with multiple hotels and lodges in key cities and rural areas,
                ensuring high-season availability, competitive rates, and consistent quality.
              </p>
              <ul className="list-disc pl-5 text-slate-700 mt-3 space-y-1">
                <li>Curated selection by location, service, and safety</li>
                <li>Options for different budgets</li>
                <li>Direct coordination for changes and special needs</li>
              </ul>
            </div>
          </article>

          <article className="card hover:shadow-md transition-shadow duration-200">
            <div className="card-body">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                🪶 Native community alliances
              </h2>
              <p className="text-slate-600 mt-2 leading-relaxed">
                We collaborate with native communities to design experiences that respect their
                rhythm, traditions, and local economy. Your visit creates direct impact and fosters
                responsible tourism.
              </p>
              <ul className="list-disc pl-5 text-slate-700 mt-3 space-y-1">
                <li>Authentic experiences hosted by local leaders</li>
                <li>Cultural respect protocols and best practices</li>
                <li>Reinvestment in community projects and crafts</li>
              </ul>
            </div>
          </article>
        </section>

        {/* Values */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { t: "Safety first", d: "Licensed vehicles, trained staff, and clear protocols." },
            { t: "Culture & respect", d: "We honor heritage, customs, and community practices." },
            { t: "Sustainability", d: "We promote low-impact practices and local economies." },
          ].map((v, i) => (
            <div
              key={i}
              className="rounded-xl border p-5 bg-white hover:bg-green-50 transition-colors duration-200"
            >
              <p className="font-semibold text-slate-900">{v.t}</p>
              <p className="text-slate-600 mt-1 text-sm leading-relaxed">{v.d}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div>
            <p className="font-semibold text-lg">Plan your trip with {BRAND}</p>
            <p className="text-sm opacity-90">
              Write to us:&nbsp;
              <a className="underline hover:text-white/80" href={`mailto:${EMAIL}`}>
                {EMAIL}
              </a>{" "}
              · Tel:&nbsp;
              <a className="underline hover:text-white/80" href={toTelHref(PHONE)}>
                {PHONE}
              </a>
              <br />
              Visit us: <span className="font-medium">{ADDRESS}</span>
            </p>
          </div>
          <Link
            href="/contact"
            className="bg-white text-green-700 font-semibold px-5 py-2.5 rounded-md shadow hover:bg-green-50 transition"
          >
            ✉️ Contact us
          </Link>
        </section>
      </section>
    </main>
  );
}
>>>>>>> 72d948c6d1c7d86949e7e46b13be97d4a318e6d9
