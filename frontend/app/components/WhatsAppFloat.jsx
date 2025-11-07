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
