export const metadata = {
  title: "Cookies Policy | Vicuña Adventures",
};

const copy = {
  en: {
    title: "Cookies Policy",
    updated: "Last updated: January 31, 2026",
    intro:
      "We use cookies to improve site performance, personalize content, and understand how visitors use the website.",
    sections: [
      {
        title: "1. What are cookies?",
        body:
          "Cookies are small text files stored in your browser that help websites remember preferences and sessions.",
      },
      {
        title: "2. Types of cookies we use",
        body:
          "Essential cookies (site functionality), analytics cookies (usage insights), and preference cookies (language).",
      },
      {
        title: "3. Managing cookies",
        body:
          "You can control or delete cookies from your browser settings. Disabling cookies may affect site functionality.",
      },
      {
        title: "4. Contact",
        body:
          "Questions about cookies: contact@vicuadvent.com.",
      },
    ],
  },
  es: {
    title: "Política de Cookies",
    updated: "Última actualización: 31 de enero de 2026",
    intro:
      "Usamos cookies para mejorar el rendimiento del sitio, personalizar contenido y entender cómo se usa la web.",
    sections: [
      {
        title: "1. ¿Qué son las cookies?",
        body:
          "Son pequeños archivos de texto guardados en tu navegador que ayudan a recordar preferencias y sesiones.",
      },
      {
        title: "2. Tipos de cookies que usamos",
        body:
          "Cookies esenciales (funcionalidad), analíticas (uso del sitio) y de preferencias (idioma).",
      },
      {
        title: "3. Administrar cookies",
        body:
          "Puedes controlar o eliminar cookies desde la configuración del navegador. Desactivarlas puede afectar el sitio.",
      },
      {
        title: "4. Contacto",
        body:
          "Consultas sobre cookies: contact@vicuadvent.com.",
      },
    ],
  },
};

export default function CookiesPage({ params }) {
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
