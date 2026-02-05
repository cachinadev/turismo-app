export const metadata = {
  title: "Términos y Condiciones | Vicuña Adventures",
};

const copy = {
  es: {
    title: "Términos y Condiciones",
    updated: "Última actualización: 31 de enero de 2026",
    intro:
      "Estos términos regulan el uso del sitio y la contratación de servicios turísticos ofrecidos por Vicuña Adventures. Al usar el sitio o reservar, aceptas estas condiciones.",
    sections: [
      {
        title: "1. Reservas y pagos",
        body:
          "Las reservas están sujetas a disponibilidad. Los precios pueden variar por temporada, demanda o feriados. El pago confirma la reserva según el método acordado.",
      },
      {
        title: "2. Cambios y cancelaciones",
        body:
          "Los cambios de fecha y cancelaciones dependen de la política del paquete. Te informaremos las condiciones específicas antes de confirmar.",
      },
      {
        title: "3. Responsabilidades del viajero",
        body:
          "El viajero debe proporcionar datos verídicos, cumplir requisitos de salud/edad y seguir las indicaciones de seguridad del guía.",
      },
      {
        title: "4. Responsabilidades de la empresa",
        body:
          "Vicuña Adventures se compromete a brindar el servicio según lo ofertado. Eventos externos (clima, cierres) pueden requerir ajustes razonables.",
      },
      {
        title: "5. Propiedad intelectual",
        body:
          "Los contenidos del sitio (texto, imágenes, logotipos) pertenecen a Vicuña Adventures o sus proveedores y no pueden usarse sin autorización.",
      },
      {
        title: "6. Contacto",
        body:
          "Para consultas sobre términos o reservas, escríbenos a contact@vicuadvent.com.",
      },
    ],
  },
  en: {
    title: "Terms & Conditions",
    updated: "Last updated: January 31, 2026",
    intro:
      "These terms govern the use of this site and the booking of travel services provided by Vicuña Adventures. By using the site or booking, you agree to these terms.",
    sections: [
      {
        title: "1. Bookings and payments",
        body:
          "Bookings are subject to availability. Prices may vary by season, demand, or holidays. Payment confirms the booking according to the agreed method.",
      },
      {
        title: "2. Changes and cancellations",
        body:
          "Date changes and cancellations depend on each package policy. We will inform you of the specific conditions before confirmation.",
      },
      {
        title: "3. Traveler responsibilities",
        body:
          "Travelers must provide accurate information, meet health/age requirements, and follow guide safety instructions.",
      },
      {
        title: "4. Company responsibilities",
        body:
          "Vicuña Adventures provides services as described. External events (weather, closures) may require reasonable adjustments.",
      },
      {
        title: "5. Intellectual property",
        body:
          "Site content (text, images, logos) belongs to Vicuña Adventures or its providers and may not be used without permission.",
      },
      {
        title: "6. Contact",
        body:
          "For questions about terms or bookings, email us at contact@vicuadvent.com.",
      },
    ],
  },
};

export default function TermsPage({ params }) {
  const locale = params?.locale === "es" ? "es" : "en";
  const c = copy[locale];

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <section className="container-default py-12 px-4 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{c.title}</h1>
        <p className="text-sm text-slate-500 mb-6">{c.updated}</p>
        <p className="text-slate-700 mb-8">{c.intro}</p>

        <div className="space-y-6">
          {c.sections.map((s) => (
            <div key={s.title} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">{s.title}</h2>
              <p className="text-slate-700">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
