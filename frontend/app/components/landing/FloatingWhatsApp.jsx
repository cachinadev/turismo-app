// app/components/landing/FloatingWhatsApp.jsx
"use client";
export default function FloatingWhatsApp({ phone }) {
  if (!phone) return null;
  return (
    <a
      href={`https://wa.me/${phone}`}
      target="_blank"
      className="fixed bottom-5 right-5 h-12 w-12 rounded-full bg-green-500 text-white grid place-items-center shadow-lg hover:scale-105 transition"
      aria-label="WhatsApp"
      title="WhatsApp"
    >
      WA
    </a>
  );
}
