export const metadata = {
  title: "Transport | Vicuña Adventures",
};

const copy = {
  es: {
    title: "Transporte & Experiencias Locales",
    subtitle:
      "Recojos desde el aeropuerto, traslados seguros y actividades locales en Puno y el Lago Titicaca.",
    sections: [
      {
        title: "Recojo de aeropuerto",
        body:
          "Servicio de recojo y traslado privado desde y hacia el aeropuerto con coordinación previa.",
      },
      {
        title: "Viajes en barco (Lago Titicaca)",
        body:
          "Tours en lancha a las islas Uros, Taquile y Amantaní con horarios flexibles.",
      },
      {
        title: "Cabalgatas y experiencias rurales",
        body:
          "Paseos a caballo y visitas a comunidades locales para una experiencia auténtica.",
      },
      {
        title: "Traslados urbanos",
        body:
          "Movilidad segura dentro de la ciudad, hoteles y puntos turísticos.",
      },
    ],
    cta: "Solicitar información",
  },
  en: {
    title: "Transport & Local Experiences",
    subtitle:
      "Airport pickups, safe transfers, and local activities in Puno and Lake Titicaca.",
    sections: [
      {
        title: "Airport pickup",
        body:
          "Private pickup and transfer service to and from the airport with prior coordination.",
      },
      {
        title: "Boat trips (Lake Titicaca)",
        body:
          "Boat tours to Uros, Taquile, and Amantaní with flexible schedules.",
      },
      {
        title: "Horse riding & rural experiences",
        body:
          "Horseback rides and visits to local communities for an authentic experience.",
      },
      {
        title: "City transfers",
        body:
          "Safe transportation within the city, hotels, and tourist points.",
      },
    ],
    cta: "Request information",
  },
};

export default function TransportPage({ params }) {
  const locale = params?.locale === "es" ? "es" : "en";
  const c = copy[locale];

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 pt-24">
      <section className="container-default py-12 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{c.title}</h1>
          <p className="text-slate-600">{c.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {c.sections.map((s) => (
            <div key={s.title} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">{s.title}</h2>
              <p className="text-slate-700">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <a href={`/${locale}/contact`} className="btn btn-primary">
            {c.cta}
          </a>
        </div>
      </section>
    </main>
  );
}
