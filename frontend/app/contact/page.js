'use client';
import { useState, useEffect } from 'react';
import ContactForm from "./ContactForm";
import { usePathname } from 'next/navigation';
import { MessageCircle, Mail, Phone, Shield, Star, Clock } from 'lucide-react';

// ========== FUNCIONES DE TRADUCCIÓN ==========
async function loadMessages(locale) {
  try {
    const mod = await import(`@/messages/${locale}.json`);
    return mod.default?.Contact || {};
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

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Vicuña Adventures S.A.C.";
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contacto@vicuadvent.com";
const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || "+51 989 765 432";
const WHATSAPP_LINK = process.env.NEXT_PUBLIC_WHATSAPP_LINK || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

const LOCALES = ['es', 'en', 'fr', 'pt', 'ru'];
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'es';

const normalizeBase = (u = "") => u.replace(/\/+$/, "");
const digits = (s = "") => s.replace(/[^\d]/g, "");
const waHref = WHATSAPP_LINK || `https://wa.me/${digits(CONTACT_PHONE)}`;

export default function ContactPage() {
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [messages, setMessages] = useState({});
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

  const t = (key, fallback) => tr(messages, key, fallback);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden" style={{ backgroundColor: '#0E374A' }}>
        {/* Pattern Background */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }}
          ></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="font-bree text-5xl md:text-6xl text-white mb-4">
              {t('hero.title', 'Contáctanos')}
            </h1>
            <p className="font-tequilla text-lg md:text-xl text-white/90 leading-relaxed">
              {t('hero.subtitle', '¿Tienes preguntas sobre un tour o necesitas un itinerario personalizado? Escríbenos y te responderemos lo antes posible.')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Contact Info Sidebar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6 md:p-8 sticky top-8">
              <h2 className="font-bree text-2xl mb-4" style={{ color: '#0E374A' }}>
                {t('sidebar.title', 'Ponte en Contacto')}
              </h2>

              <p className="font-tequilla text-slate-600 mb-8 leading-relaxed">
                {COMPANY_NAME} — {t('sidebar.company', 'experiencias auténticas en todo Perú con')}{" "}
                <span className="font-bold" style={{ color: '#0086C0' }}>
                  {BRAND_NAME}
                </span>
                .
              </p>

              <div className="space-y-6">
                {/* Email */}
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                    style={{ backgroundColor: '#0086C0' }}
                  >
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bree text-sm mb-1" style={{ color: '#0E374A' }}>
                      {t('sidebar.emailLabel', 'Correo Electrónico')}
                    </p>
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="font-tequilla text-sm break-all hover:underline transition-colors"
                      style={{ color: '#0086C0' }}
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                    style={{ backgroundColor: '#A3B117' }}
                  >
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bree text-sm mb-1" style={{ color: '#0E374A' }}>
                      {t('sidebar.phoneLabel', 'Teléfono / WhatsApp')}
                    </p>
                    <a
                      href={`tel:${CONTACT_PHONE}`}
                      className="font-tequilla text-sm hover:underline transition-colors"
                      style={{ color: '#0086C0' }}
                    >
                      {CONTACT_PHONE}
                    </a>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mt-8">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl font-bree text-white transition-all hover:scale-[1.02] shadow-md"
                  style={{ backgroundColor: '#A3B117' }}
                >
                  <MessageCircle className="w-5 h-5" />
                  {t('sidebar.whatsappButton', 'Mensaje por WhatsApp')}
                </a>

                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl font-bree text-white transition-all hover:scale-[1.02] shadow-md"
                  style={{ backgroundColor: '#0086C0' }}
                >
                  <Mail className="w-5 h-5" />
                  {t('sidebar.emailButton', 'Enviar Correo')}
                </a>
              </div>

              {/* Additional Info */}
              <div className="mt-8 pt-6 border-t-2 border-slate-100">
                <p className="font-tequilla text-xs text-slate-500 leading-relaxed">
                  {t('sidebar.responseTime', 'Normalmente respondemos en 24 horas durante días laborables. Para consultas urgentes, contáctanos por WhatsApp.')}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6 md:p-8">
              <div className="mb-8">
                <h2 className="font-bree text-3xl mb-3" style={{ color: '#0E374A' }}>
                  {t('form.title', 'Envíanos un Mensaje')}
                </h2>
                <p className="font-tequilla text-slate-600 leading-relaxed">
                  {t('form.subtitle', 'Comparte tus fechas de viaje, número de viajeros e intereses. Nuestro equipo responderá con propuestas personalizadas y próximos pasos.')}
                </p>
              </div>

              <ContactForm locale={locale} />
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center hover:shadow-md transition-shadow">
                <div className="flex justify-center mb-2">
                  <Shield className="w-8 h-8" style={{ color: '#0086C0' }} />
                </div>
                <p className="font-bree text-xs" style={{ color: '#0E374A' }}>
                  {t('badges.certified', 'Guías Certificados')}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center hover:shadow-md transition-shadow">
                <div className="flex justify-center mb-2">
                  <Star className="w-8 h-8" style={{ color: '#A3B117' }} />
                </div>
                <p className="font-bree text-xs" style={{ color: '#0E374A' }}>
                  {t('badges.rated', '5 Estrellas')}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center hover:shadow-md transition-shadow">
                <div className="flex justify-center mb-2">
                  <Clock className="w-8 h-8" style={{ color: '#0086C0' }} />
                </div>
                <p className="font-bree text-xs" style={{ color: '#0E374A' }}>
                  {t('badges.support', 'Soporte 24/7')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}