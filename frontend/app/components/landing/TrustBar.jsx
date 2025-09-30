// app/components/landing/TrustBar.jsx
export default function TrustBar() {
  const items = [
    { t: "Soporte 24/7", d: "Acompañamiento por WhatsApp y correo" },
    { t: "Guías certificados", d: "Operadores locales con experiencia" },
    { t: "Reserva flexible", d: "Cambios sujetos a disponibilidad" },
  ];
  return (
    <section className="py-6 bg-slate-50 border-y border-slate-100">
      <div className="container-default grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((x, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-100 grid place-items-center font-bold text-brand-700">
              {i + 1}
            </div>
            <div>
              <p className="font-semibold">{x.t}</p>
              <p className="text-slate-600 text-sm">{x.d}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
