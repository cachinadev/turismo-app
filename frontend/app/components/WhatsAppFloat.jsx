<<<<<<< HEAD
'use client';

import { useState, useMemo } from 'react';

const DEFAULT_PHONE = '+51 953858267';
const DEFAULT_MESSAGE = '¡Hola! Me gustaría obtener más información sobre los paquetes turísticos.';

export default function WhatsAppFloat() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  const href = useMemo(() => {
    if (!DEFAULT_PHONE) return null;
    const msg = text || DEFAULT_MESSAGE;
    return `https://wa.me/${DEFAULT_PHONE.replace(/[^\d]/g, '')}?text=${encodeURIComponent(msg)}`;
  }, [text]);

  return (
    <>
      <style jsx global>{`
        @keyframes pulseWhatsApp {
          0% { 
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 0 12px rgba(37, 211, 102, 0);
            transform: scale(1.05);
          }
          100% { 
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0);
            transform: scale(1);
          }
        }
        .pulse-wa {
          animation: pulseWhatsApp 2s infinite;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>

      {/* Cuadro Flotante */}
      {open && (
        <div className="slide-up fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 bg-white rounded-2xl shadow-2xl z-[9999] overflow-hidden border-2 border-slate-200">
          
          {/* Header con gradiente */}
          <div className="relative overflow-hidden px-5 py-4" style={{ background: 'linear-gradient(135deg, #25D366 0%, #1ebe5d 100%)' }}>
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M0 0h20v20H0V0zm10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm20 0a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM10 37a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm10-17h20v20H20V20zm10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14z"/%3E%3C/g%3E%3C/svg%3E")',
            }}></div>
            
            <div className="relative flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.11 5.09A9.89 9.89 0 0012.05 2a10 10 0 00-8.7 14.86L2 22l5.25-1.38A10 10 0 1019.11 5.09zM12 20a8 8 0 01-4.06-1.11l-.29-.17-3.12.82.84-3.05-.2-.31A8 8 0 1112 20zm4.43-5.42c-.24-.12-1.42-.71-1.64-.79s-.38-.12-.54.12-.62.79-.76.95-.28.18-.52.06a6.54 6.54 0 01-1.92-1.18 7.16 7.16 0 01-1.31-1.63c-.14-.24 0-.37.11-.49s.24-.28.36-.42a1.61 1.61 0 00.24-.4.45.45 0 00-.02-.42c-.06-.12-.54-1.3-.74-1.78s-.4-.41-.54-.41h-.46a.88.88 0 00-.63.3 2.62 2.62 0 00-.83 1.94 4.54 4.54 0 00.94 2.35 10.66 10.66 0 004.33 3.7 4.26 4.26 0 002.39.73 2 2 0 001.36-.56 1.71 1.71 0 00.37-1.15c-.02-.15-.1-.24-.23-.29z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bree text-lg font-bold">Vicuña Adventures</h3>
                  <div className="flex items-center gap-1.5 text-sm font-tequilla">
                    <span className="block w-2 h-2 rounded-full bg-white shadow-lg"></span>
                    En línea
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mensajes del Bot */}
          <div className="p-5 bg-gradient-to-b from-slate-50 to-white space-y-3">
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-lg" style={{ backgroundColor: '#25D366' }}>
                💬
              </div>
              <div className="flex-1">
                <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-slate-200">
                  <p className="font-tequilla text-sm leading-relaxed" style={{ color: '#0E374A' }}>
                    ¡Hola! 👋 Bienvenido a <span className="font-bold" style={{ color: '#0086C0' }}>Vicuña Adventures</span>
                  </p>
                  <p className="font-tequilla text-sm leading-relaxed mt-2" style={{ color: '#0E374A' }}>
                    ¿En qué puedo ayudarte hoy?
                  </p>
                  <span className="font-tequilla text-xs text-slate-400 mt-2 block">Ahora</span>
                </div>
              </div>
            </div>

            {/* Quick Replies */}
            <div className="flex flex-wrap gap-2 pl-10">
              <button
                onClick={() => setText('Quisiera información sobre tours en Cusco')}
                className="px-3 py-2 rounded-full text-xs font-bree border-2 transition-all hover:scale-105"
                style={{ 
                  borderColor: '#0086C0', 
                  color: '#0086C0',
                  backgroundColor: 'white'
                }}
              >
                🏔️ Tours Cusco
              </button>
              <button
                onClick={() => setText('¿Cuáles son los paquetes disponibles?')}
                className="px-3 py-2 rounded-full text-xs font-bree border-2 transition-all hover:scale-105"
                style={{ 
                  borderColor: '#0086C0', 
                  color: '#0086C0',
                  backgroundColor: 'white'
                }}
              >
                📦 Paquetes
              </button>
              <button
                onClick={() => setText('Necesito ayuda con mi reserva')}
                className="px-3 py-2 rounded-full text-xs font-bree border-2 transition-all hover:scale-105"
                style={{ 
                  borderColor: '#0086C0', 
                  color: '#0086C0',
                  backgroundColor: 'white'
                }}
              >
                🎫 Reservas
              </button>
            </div>

            {/* Input Area */}
            <div className="pt-2">
              <label className="font-tequilla text-xs mb-2 block" style={{ color: '#0E374A' }}>
                Escribe tu mensaje:
              </label>
              <textarea
                placeholder="Ej: Necesito información sobre Machu Picchu..."
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-tequilla focus:outline-none focus:border-[#0086C0] transition-colors resize-none"
                style={{ color: '#0E374A' }}
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <p className="font-tequilla text-xs text-slate-400 mt-1.5">
                Te responderemos en WhatsApp en menos de 5 minutos
              </p>
            </div>
          </div>

          {/* Botón Enviar */}
          <div className="p-5 bg-white border-t-2 border-slate-100">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bree text-white transition-all hover:scale-[1.02] shadow-md"
              style={{ backgroundColor: '#25D366' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.11 5.09A9.89 9.89 0 0012.05 2a10 10 0 00-8.7 14.86L2 22l5.25-1.38A10 10 0 1019.11 5.09zM12 20a8 8 0 01-4.06-1.11l-.29-.17-3.12.82.84-3.05-.2-.31A8 8 0 1112 20zm4.43-5.42c-.24-.12-1.42-.71-1.64-.79s-.38-.12-.54.12-.62.79-.76.95-.28.18-.52.06a6.54 6.54 0 01-1.92-1.18 7.16 7.16 0 01-1.31-1.63c-.14-.24 0-.37.11-.49s.24-.28.36-.42a1.61 1.61 0 00.24-.4.45.45 0 00-.02-.42c-.06-.12-.54-1.3-.74-1.78s-.4-.41-.54-.41h-.46a.88.88 0 00-.63.3 2.62 2.62 0 00-.83 1.94 4.54 4.54 0 00.94 2.35 10.66 10.66 0 004.33 3.7 4.26 4.26 0 002.39.73 2 2 0 001.36-.56 1.71 1.71 0 00.37-1.15c-.02-.15-.1-.24-.23-.29z"/>
              </svg>
              Continuar en WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* Botón Flotante */}
      <button
        onClick={() => setOpen(!open)}
        className="pulse-wa fixed bottom-6 right-4 sm:right-6 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 z-[9998]"
        style={{ backgroundColor: '#25D366' }}
        aria-label="Abrir chat de WhatsApp"
      >
        {open ? (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.11 5.09A9.89 9.89 0 0012.05 2a10 10 0 00-8.7 14.86L2 22l5.25-1.38A10 10 0 1019.11 5.09zM12 20a8 8 0 01-4.06-1.11l-.29-.17-3.12.82.84-3.05-.2-.31A8 8 0 1112 20zm4.43-5.42c-.24-.12-1.42-.71-1.64-.79s-.38-.12-.54.12-.62.79-.76.95-.28.18-.52.06a6.54 6.54 0 01-1.92-1.18 7.16 7.16 0 01-1.31-1.63c-.14-.24 0-.37.11-.49s.24-.28.36-.42a1.61 1.61 0 00.24-.4.45.45 0 00-.02-.42c-.06-.12-.54-1.3-.74-1.78s-.4-.41-.54-.41h-.46a.88.88 0 00-.63.3 2.62 2.62 0 00-.83 1.94 4.54 4.54 0 00.94 2.35 10.66 10.66 0 004.33 3.7 4.26 4.26 0 002.39.73 2 2 0 001.36-.56 1.71 1.71 0 00.37-1.15c-.02-.15-.1-.24-.23-.29z"/>
          </svg>
        )}
      </button>

      {/* Badge de notificación (opcional) */}
      {!open && (
        <div className="fixed bottom-[4.5rem] right-[4.5rem] sm:right-[5rem] w-6 h-6 rounded-full bg-red-500 border-2 border-white flex items-center justify-center z-[9999] shadow-lg animate-pulse">
          <span className="font-bree text-xs text-white font-bold">1</span>
        </div>
      )}
    </>
  );
}
=======
//frontend/app/components/WhatsAppFloat.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

/* ------------------------------------------------------
 * 🔧 Config & Defaults
 * ------------------------------------------------------ */
const HIDE_ON_PREFIXES = ['/admin'];
const DEFAULT_PHONE = '+51 953858267';
const DEFAULT_MESSAGE = 'Hi! I have a question about this page.';

// Supported locales
const SUPPORTED_LOCALES = ['es', 'en', 'fr', 'pt', 'ru'];
const DEFAULT_LOCALE = 'es';

/* ------------------------------------------------------
 * 🧮 Utility helpers
 * ------------------------------------------------------ */
const digits = (s) => String(s || '').replace(/[^\d]/g, '');

function buildWhatsAppLink({ phone, message }) {
  const num = digits(phone);
  if (!num) return null;

  const title = typeof document !== 'undefined' ? document.title : '';
  const url = typeof window !== 'undefined' ? window.location.href : '';

  const parts = [
    message || DEFAULT_MESSAGE,
    title ? `\n\n📄 Page: ${title}` : '',
    url ? `\n🔗 ${url}` : '',
  ];

  const text = encodeURIComponent(parts.join(''));
  return `https://wa.me/${num}?text=${text}`;
}

/* ------------------------------------------------------
 * 💬 WhatsApp Floating Button (manual locale translation)
 * ------------------------------------------------------ */
export default function WhatsAppFloat({
  phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
          process.env.NEXT_PUBLIC_PHONE ||
          DEFAULT_PHONE,
  message,
}) {
  const pathname = usePathname() || '/';

  // Detect locale from URL path
  const segment = pathname.split('/')[1] || '';
  const locale = SUPPORTED_LOCALES.includes(segment)
    ? segment
    : DEFAULT_LOCALE;

  const [t, setT] = useState({
    tooltip: 'Chat on WhatsApp',
    defaultMessage: DEFAULT_MESSAGE,
  });

  // Load WhatsApp translations manually
  useEffect(() => {
    import(`@/messages/${locale}.json`)
      .then((m) => setT(m.WhatsApp || t))
      .catch(() => setT({
        tooltip: 'Chat on WhatsApp',
        defaultMessage: DEFAULT_MESSAGE,
      }));
  }, [locale]);

  const hide = HIDE_ON_PREFIXES.some((p) => pathname.startsWith(p));
  if (hide) return null;

  const localizedMessage = message || t.defaultMessage;

  const href = useMemo(
    () => buildWhatsAppLink({ phone, message: localizedMessage }),
    [phone, localizedMessage]
  );

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.tooltip}
      className="fixed z-50 bottom-6 right-6 group print:hidden 
                 focus-visible:outline-none focus-visible:ring-2 
                 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Bubble */}
      <div
        className="relative flex items-center justify-center w-14 h-14 rounded-full 
                   bg-[#25D366] text-white shadow-xl 
                   transition-transform duration-300 
                   hover:scale-110 active:scale-95 
                   hover:shadow-[0_0_20px_#25D366cc]"
      >
        {/* WhatsApp Icon */}
        <svg viewBox="0 0 32 32" aria-hidden="true" className="w-7 h-7">
          <path
            fill="currentColor"
            d="M19.1 17.6c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 .9-.2 0-.5 0-1-.5S12.8 16 12.6 16s-.4-.4-.4-.7c0-.3.2-.4.3-.5.1-.1.2-.2.3-.3.1-.1.1-.2.2-.3.1-.1.1-.2.1-.3 0-.1 0-.2-.1-.3-.1-.1-.7-1.7-.9-2.3-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.9 2.3 1 2.5c.1.2 1.8 2.8 4.3 3.9.6.3 1.1.5 1.5.6.6.2 1.1.2 1.5.1.5-.1 1.7-.7 2-1.4.2-.7.2-1.2.1-1.3-.1-.2-.3-.2-.6-.3zM16 3C9.4 3 4 8.4 4 15c0 2.6.9 5.1 2.4 7.1L5 29l7-1.3c1.9 1 4.1 1.6 6 1.6 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 22.6c-1.8 0-3.6-.5-5.2-1.4l-.4-.2-4.1.8.8-4-.2-.4C6 18.7 5.4 16.9 5.4 15 5.4 9.8 9.8 5.4 15 5.4S24.6 9.8 24.6 15 22.2 25.6 16 25.6z"
          />
        </svg>

        {/* Ping animation */}
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-20 animate-ping"></span>
      </div>

      {/* Tooltip */}
      <div
        className="absolute -left-32 bottom-3 px-3 py-1.5 rounded-lg shadow-md 
                   bg-black/75 text-white text-xs hidden sm:block 
                   opacity-0 group-hover:opacity-100 
                   transition-opacity duration-200"
      >
        {t.tooltip}
      </div>
    </a>
  );
}
>>>>>>> 72d948c6d1c7d86949e7e46b13be97d4a318e6d9
