// frontend/app/components/TelegramFloat.jsx
'use client';

import { useMemo, useState } from 'react';

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'Vicuña Adventures';

// Puedes usar USERNAME (recomendado) o URL completa
const TELEGRAM_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_USERNAME || ''; // ej: vicuadventures
const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL || ''; // ej: https://t.me/vicuadventures

const DEFAULT_MESSAGE =
  process.env.NEXT_PUBLIC_TELEGRAM_DEFAULT_MESSAGE ||
  '¡Hola! Me gustaría obtener más información sobre los paquetes turísticos.';

function buildTelegramLink(username, url, message) {
  const msg = encodeURIComponent(message || DEFAULT_MESSAGE);

  // 1) Si dan URL completa, la usamos
  if (url) {
    // Si ya es t.me o telegram.me, lo respetamos
    // Nota: Telegram no siempre soporta ?text= en perfiles. Si fuera un bot, sí con /start.
    return url;
  }

  // 2) Si dan username, armamos t.me/username
  if (username) {
    return `https://t.me/${username.replace('@', '')}`;
  }

  // 3) Fallback nulo
  return null;
}

export default function TelegramFloat() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  const href = useMemo(() => {
    const msg = text?.trim() ? text.trim() : DEFAULT_MESSAGE;
    return buildTelegramLink(TELEGRAM_USERNAME, TELEGRAM_URL, msg);
  }, [text]);

  return (
    <>
      <style jsx global>{`
        @keyframes pulseTelegram {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 158, 217, 0.55);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(34, 158, 217, 0);
            transform: scale(1.05);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(34, 158, 217, 0);
            transform: scale(1);
          }
        }
        .pulse-tg {
          animation: pulseTelegram 2s infinite;
        }
        @keyframes slideUpTg {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .slide-up-tg {
          animation: slideUpTg 0.3s ease-out;
        }
      `}</style>

      {/* Cuadro Flotante */}
      {open && (
        <div className="slide-up-tg fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 bg-white rounded-2xl shadow-2xl z-[9999] overflow-hidden border-2 border-slate-200">
          {/* Header */}
          <div
            className="relative overflow-hidden px-5 py-4"
            style={{ background: 'linear-gradient(135deg, #229ED9 0%, #1788bd 100%)' }}
          >
            <div className="relative flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  {/* Telegram icon */}
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden="true">
                    <path d="M9.78 15.41 9.6 18.2c.41 0 .59-.18.81-.39l1.95-1.86 4.05 2.96c.74.41 1.27.19 1.46-.69l2.65-12.43c.27-1.07-.41-1.49-1.12-1.23L3.31 9.58c-1.03.4-1.01.97-.18 1.23l4.14 1.29 9.63-6.07c.45-.27.87-.12.53.15l-7.65 6.91z" />
                  </svg>
                </div>

                <div>
                  <h3 className="font-bree text-lg font-bold">{BRAND}</h3>
                  <div className="flex items-center gap-1.5 text-sm font-tequilla">
                    <span className="block w-2 h-2 rounded-full bg-white shadow-lg" />
                    En línea
                  </div>
                  {(TELEGRAM_USERNAME || TELEGRAM_URL) && (
                    <div className="text-xs opacity-90 mt-0.5 font-tequilla">
                      Telegram: {TELEGRAM_USERNAME ? `@${TELEGRAM_USERNAME.replace('@', '')}` : 't.me'}
                    </div>
                  )}
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

          {/* Body */}
          <div className="p-5 bg-gradient-to-b from-slate-50 to-white space-y-3">
            <div className="flex gap-2">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-lg"
                style={{ backgroundColor: '#229ED9' }}
              >
                ✈️
              </div>
              <div className="flex-1">
                <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-slate-200">
                  <p className="font-tequilla text-sm leading-relaxed" style={{ color: '#0E374A' }}>
                    ¡Hola! 👋 Bienvenido a{' '}
                    <span className="font-bold" style={{ color: '#0086C0' }}>
                      {BRAND}
                    </span>
                  </p>
                  <p className="font-tequilla text-sm leading-relaxed mt-2" style={{ color: '#0E374A' }}>
                    ¿Deseas cotizar un tour o resolver dudas?
                  </p>
                  <span className="font-tequilla text-xs text-slate-400 mt-2 block">Ahora</span>
                </div>
              </div>
            </div>

            {/* Quick Replies */}
            <div className="flex flex-wrap gap-2 pl-10">
              <button
                onClick={() => setText('Quisiera información sobre tours en Puno')}
                className="px-3 py-2 rounded-full text-xs font-bree border-2 transition-all hover:scale-105"
                style={{ borderColor: '#229ED9', color: '#229ED9', backgroundColor: 'white' }}
              >
                🌊 Tours Puno
              </button>
              <button
                onClick={() => setText('¿Me pueden enviar los paquetes disponibles y precios?')}
                className="px-3 py-2 rounded-full text-xs font-bree border-2 transition-all hover:scale-105"
                style={{ borderColor: '#229ED9', color: '#229ED9', backgroundColor: 'white' }}
              >
                📦 Paquetes
              </button>
              <button
                onClick={() => setText('Necesito ayuda con mi reserva')}
                className="px-3 py-2 rounded-full text-xs font-bree border-2 transition-all hover:scale-105"
                style={{ borderColor: '#229ED9', color: '#229ED9', backgroundColor: 'white' }}
              >
                🎫 Reservas
              </button>
            </div>

            {/* Input */}
            <div className="pt-2">
              <label className="font-tequilla text-xs mb-2 block" style={{ color: '#0E374A' }}>
                Escribe tu mensaje:
              </label>
              <textarea
                placeholder="Ej: Necesito un tour a Uros + Taquile..."
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-tequilla focus:outline-none transition-colors resize-none"
                style={{ color: '#0E374A' }}
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <p className="font-tequilla text-xs text-slate-400 mt-1.5">Te atenderemos por Telegram</p>
            </div>
          </div>

          {/* CTA */}
          <div className="p-5 bg-white border-t-2 border-slate-100">
            <a
              href={href || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bree text-white transition-all shadow-md ${
                href ? 'hover:scale-[1.02]' : 'opacity-60 cursor-not-allowed'
              }`}
              style={{ backgroundColor: '#229ED9' }}
              aria-disabled={!href}
              onClick={(e) => {
                if (!href) e.preventDefault();
              }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
                <path d="M9.78 15.41 9.6 18.2c.41 0 .59-.18.81-.39l1.95-1.86 4.05 2.96c.74.41 1.27.19 1.46-.69l2.65-12.43c.27-1.07-.41-1.49-1.12-1.23L3.31 9.58c-1.03.4-1.01.97-.18 1.23l4.14 1.29 9.63-6.07c.45-.27.87-.12.53.15l-7.65 6.91z" />
              </svg>
              Continuar en Telegram
            </a>
          </div>
        </div>
      )}

      {/* Botón Flotante */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="pulse-tg fixed bottom-6 right-24 sm:right-28 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 z-[9998]"
        style={{ backgroundColor: '#229ED9' }}
        aria-label="Abrir chat de Telegram"
      >
        {open ? (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor" aria-hidden="true">
            <path d="M9.78 15.41 9.6 18.2c.41 0 .59-.18.81-.39l1.95-1.86 4.05 2.96c.74.41 1.27.19 1.46-.69l2.65-12.43c.27-1.07-.41-1.49-1.12-1.23L3.31 9.58c-1.03.4-1.01.97-.18 1.23l4.14 1.29 9.63-6.07c.45-.27.87-.12.53.15l-7.65 6.91z" />
          </svg>
        )}
      </button>
    </>
  );
}
