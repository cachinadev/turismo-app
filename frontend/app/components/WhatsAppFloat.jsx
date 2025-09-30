// frontend/app/components/WhatsAppFloat.jsx
'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { CONTACT_PHONE, WHATSAPP_DEFAULT_MESSAGE } from '@/app/lib/config';

const HIDE_ON_PREFIXES = ['/admin'];

const digits = (s) => String(s || '').replace(/[^\d]/g, '');

function buildHref({ phone, baseMessage }) {
  const num = digits(phone);
  if (!num) return null;

  const title = typeof document !== 'undefined' ? document.title : '';
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const parts = [
    baseMessage || 'Hi! I have a question about this page.',
    title ? `\n\nPage: ${title}` : '',
    url ? `\n${url}` : '',
  ];
  const text = encodeURIComponent(parts.join(''));
  return `https://wa.me/${num}?text=${text}`;
}

export default function WhatsAppFloat({
  message = WHATSAPP_DEFAULT_MESSAGE,
}) {
  const pathname = usePathname();
  const hide = HIDE_ON_PREFIXES.some((p) => pathname.startsWith(p));
  if (hide) return null;

  const phone =
    CONTACT_PHONE ||
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    process.env.NEXT_PUBLIC_PHONE ||
    '+51 982397386';

  const href = useMemo(
    () => buildHref({ phone, baseMessage: message }),
    [phone, message]
  );

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed z-50 bottom-6 right-6 group print:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Main round bubble */}
      <div
        className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-xl bg-[#25D366] text-white transition-all duration-300 group-hover:scale-110 group-active:scale-95 group-hover:shadow-[0_0_20px_#25D366cc]"
      >
        {/* WhatsApp logo */}
        <svg viewBox="0 0 32 32" aria-hidden="true" className="w-7 h-7">
          <path
            fill="currentColor"
            d="M19.1 17.6c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 .9-.2 0-.5 0-1-.5S12.8 16 12.6 16s-.4-.4-.4-.7c0-.3.2-.4.3-.5.1-.1.2-.2.3-.3.1-.1.1-.2.2-.3.1-.1.1-.2.1-.3 0-.1 0-.2-.1-.3-.1-.1-.7-1.7-.9-2.3-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.9 2.3 1 2.5c.1.2 1.8 2.8 4.3 3.9.6.3 1.1.5 1.5.6.6.2 1.1.2 1.5.1.5-.1 1.7-.7 2-1.4.2-.7.2-1.2.1-1.3-.1-.2-.3-.2-.6-.3zM16 3C9.4 3 4 8.4 4 15c0 2.6.9 5.1 2.4 7.1L5 29l7-1.3c1.9 1 4.1 1.6 6 1.6 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 22.6c-1.8 0-3.6-.5-5.2-1.4l-.4-.2-4.1.8.8-4-.2-.4C6 18.7 5.4 16.9 5.4 15 5.4 9.8 9.8 5.4 15 5.4S24.6 9.8 24.6 15 22.2 25.6 16 25.6z"
          />
        </svg>

        {/* Ping effect */}
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-15 animate-ping"></span>
      </div>

      {/* Tooltip (desktop only) */}
      <div className="absolute -left-28 bottom-3 px-3 py-1 rounded-lg shadow-md bg-black/75 text-white text-xs hidden sm:inline-block group-hover:opacity-100 opacity-0 transition-opacity duration-200">
        Chat on WhatsApp
      </div>
    </a>
  );
}
