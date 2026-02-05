export const metadata = {
  title: "Privacy Policy | Vicuña Adventures",
};

const copy = {
  en: {
    title: "Privacy Policy",
    updated: "Last updated: January 31, 2026",
    intro:
      "We respect your privacy. This policy explains what data we collect and how we use it to provide your travel experience.",
    sections: [
      {
        title: "1. Information we collect",
        body:
          "We may collect your name, contact details, travel preferences, and booking information to deliver services.",
      },
      {
        title: "2. How we use your data",
        body:
          "We use your data to confirm bookings, provide customer support, improve services, and comply with legal obligations.",
      },
      {
        title: "3. Sharing",
        body:
          "We only share data with providers necessary to deliver your tour (e.g., transport, local guides). We do not sell personal data.",
      },
      {
        title: "4. Security",
        body:
          "We apply reasonable security measures to protect your information. No method of transmission is 100% secure.",
      },
      {
        title: "5. Your rights",
        body:
          "You may request access, correction, or deletion of your personal data by contacting us.",
      },
      {
        title: "6. Contact",
        body:
          "Questions about privacy: contact@vicuadvent.com.",
      },
    ],
  },
  es: {
    title: "Política de Privacidad",
    updated: "Última actualización: 31 de enero de 2026",
    intro:
      "Respetamos tu privacidad. Esta política explica qué datos recopilamos y cómo los usamos para brindarte una mejor experiencia de viaje.",
    sections: [
      {
        title: "1. Información que recopilamos",
        body:
          "Podemos recopilar tu nombre, contacto, preferencias de viaje y datos de reserva para prestar el servicio.",
      },
      {
        title: "2. Uso de datos",
        body:
          "Usamos tus datos para confirmar reservas, brindar soporte, mejorar el servicio y cumplir obligaciones legales.",
      },
      {
        title: "3. Compartir",
        body:
          "Solo compartimos datos con proveedores necesarios para el tour (transporte, guías). No vendemos datos personales.",
      },
      {
        title: "4. Seguridad",
        body:
          "Aplicamos medidas razonables para proteger tu información. Ningún método es 100% seguro.",
      },
      {
        title: "5. Tus derechos",
        body:
          "Puedes solicitar acceso, corrección o eliminación de tus datos personales contactándonos.",
      },
      {
        title: "6. Contacto",
        body:
          "Consultas sobre privacidad: contact@vicuadvent.com.",
      },
    ],
  },
};

export default function PrivacyPage({ params }) {
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
