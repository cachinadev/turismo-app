// frontend/app/components/SkipLink.jsx
'use client';

import { usePathname } from 'next/navigation';

const LABELS = {
  es: 'Ir al contenido principal',
  en: 'Skip to main content',
  fr: 'Aller au contenu principal',
  pt: 'Ir para o conteúdo principal',
  ru: 'Перейти к основному содержанию',
};

export default function SkipLink() {
  const pathname = usePathname() || '/';
  const first = pathname.split('/')[1] || 'es';
  const label = LABELS[first] || LABELS.es;

  return (
    <a
      href="#content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 z-[9999]
                 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-lg
                 font-bree-serif font-bold text-slate-900"
    >
      {label}
    </a>
  );
}
