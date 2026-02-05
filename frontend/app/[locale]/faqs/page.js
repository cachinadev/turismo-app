export const metadata = {
  title: "FAQs | Vicuña Adventures",
};

const copy = {
  en: {
    title: "Frequently Asked Questions",
    updated: "Last updated: January 31, 2026",
    items: [
      {
        q: "How do I book a tour?",
        a: "Choose a package and submit the booking form. We will confirm availability and next steps by email or WhatsApp.",
      },
      {
        q: "Can I change my date?",
        a: "Yes, date changes depend on availability and the package policy. Contact us as soon as possible.",
      },
      {
        q: "Are tours private or shared?",
        a: "We offer both collective and exclusive (private) tours. This is shown on each package.",
      },
      {
        q: "Do you offer pickups?",
        a: "Many tours include hotel pickup. Check the itinerary or ask our team for details.",
      },
      {
        q: "What languages are available?",
        a: "We support Spanish and English, and other languages depending on availability.",
      },
    ],
  },
  es: {
    title: "Preguntas Frecuentes",
    updated: "Última actualización: 31 de enero de 2026",
    items: [
      {
        q: "¿Cómo reservo un tour?",
        a: "Elige un paquete y envía el formulario de reserva. Confirmaremos disponibilidad y pasos siguientes por email o WhatsApp.",
      },
      {
        q: "¿Puedo cambiar la fecha?",
        a: "Sí, los cambios dependen de la disponibilidad y la política del paquete. Contáctanos lo antes posible.",
      },
      {
        q: "¿Los tours son privados o compartidos?",
        a: "Ofrecemos tours colectivos y exclusivos (privados). Esto se indica en cada paquete.",
      },
      {
        q: "¿Incluyen recojo?",
        a: "Muchos tours incluyen recojo en hotel. Revisa el itinerario o consulta con nuestro equipo.",
      },
      {
        q: "¿Qué idiomas están disponibles?",
        a: "Ofrecemos español e inglés, y otros idiomas según disponibilidad.",
      },
    ],
  },
};

export default function FaqsPage({ params }) {
  const locale = params?.locale === "es" ? "es" : "en";
  const c = copy[locale];

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <section className="container-default py-12 px-4 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{c.title}</h1>
        <p className="text-sm text-slate-500 mb-6">{c.updated}</p>

        <div className="space-y-4">
          {c.items.map((item) => (
            <div key={item.q} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">{item.q}</h2>
              <p className="text-slate-700">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
