// app/components/landing/CtaBanner.jsx
import Link from "next/link";

export default function CtaBanner() {
  return (
    <section className="py-14 bg-gradient-to-r from-brand-600 to-brand-700 text-white">
      <div className="container-default flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold">¿Listo para tu próxima aventura?</h3>
          <p className="text-white/90">Escríbenos y arma tu itinerario a medida con nuestros expertos.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/packages" className="btn bg-white text-brand-700 hover:bg-white/90">
            Ver paquetes
          </Link>
          <a href="https://wa.me/51999999999" target="_blank" className="btn btn-ghost">
            WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
