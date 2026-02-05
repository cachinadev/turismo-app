export const metadata = {
  title: "Mapa del sitio | Vicuña Adventures",
};

const copy = {
  es: {
    title: "Mapa del sitio",
    updated: "Última actualización: 31 de enero de 2026",
    sections: [
      {
        title: "Explorar",
        links: [
          { label: "Inicio", href: "" },
          { label: "Paquetes", href: "packages" },
          { label: "Destinos", href: "destinations" },
          { label: "Testimonios", href: "testimonials" },
          { label: "Contacto", href: "contact" },
        ],
      },
      {
        title: "Soporte",
        links: [
          { label: "Preguntas frecuentes", href: "faqs" },
          { label: "Política de privacidad", href: "privacy" },
          { label: "Términos y condiciones", href: "terms" },
          { label: "Política de cookies", href: "cookies" },
          { label: "Libro de reclamaciones", href: "complaints" },
        ],
      },
      {
        title: "Administración",
        links: [
          { label: "Panel admin", href: "admin" },
          { label: "Iniciar sesión", href: "admin/login" },
        ],
      },
    ],
  },
  en: {
    title: "Sitemap",
    updated: "Last updated: January 31, 2026",
    sections: [
      {
        title: "Explore",
        links: [
          { label: "Home", href: "" },
          { label: "Packages", href: "packages" },
          { label: "Destinations", href: "destinations" },
          { label: "Testimonials", href: "testimonials" },
          { label: "Contact", href: "contact" },
        ],
      },
      {
        title: "Support",
        links: [
          { label: "FAQs", href: "faqs" },
          { label: "Privacy Policy", href: "privacy" },
          { label: "Terms & Conditions", href: "terms" },
          { label: "Cookies Policy", href: "cookies" },
          { label: "Complaints book", href: "complaints" },
        ],
      },
      {
        title: "Administration",
        links: [
          { label: "Admin dashboard", href: "admin" },
          { label: "Login", href: "admin/login" },
        ],
      },
    ],
  },
};

export default function SitemapPage({ params }) {
  const locale = params?.locale === "es" ? "es" : "en";
  const c = copy[locale];
  const base = `/${locale}`;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 pt-24">
      <section className="container-default py-12 px-4 max-w-4xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{c.title}</h1>
        <p className="text-sm text-slate-500 mb-8">{c.updated}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {c.sections
            .filter((s) => s.title !== "Administración" && s.title !== "Administration")
            .map((s) => (
              <div key={s.title} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">{s.title}</h2>
                <ul className="space-y-2 text-slate-700">
                  {s.links.map((l) => (
                    <li key={l.label}>
                      <a className="underline hover:text-[#0086C0]" href={`${base}/${l.href}`.replace(/\/+$/, "")}>
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </section>
    </main>
  );
}
