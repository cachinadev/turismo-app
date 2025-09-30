// app/components/landing/FeaturedGrid.jsx
import Link from "next/link";
import { mediaUrl } from "@/app/lib/media";

export default function FeaturedGrid({ items = [] }) {
  return (
    <div className="container-default">
      <div className="flex items-end justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold">Paquetes destacados</h2>
        <Link href="/packages" className="text-brand-700 font-medium">
          Ver todos
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-slate-600">
              Aún no hay paquetes activos. Crea algunos en <b>Admin → Gestión de Paquetes</b>.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((p) => (
            <Link key={p._id} href={`/packages/${p.slug}`} className="group card overflow-hidden">
              <div className="relative">
                <img
                  src={mediaUrl(p.media?.[0]?.url) || "https://picsum.photos/600/400"}
                  alt={p.title}
                  className="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3 badge">{p.city}</div>
              </div>
              <div className="card-body">
                <h3 className="font-semibold text-lg line-clamp-1">{p.title}</h3>
                <p className="text-slate-600 line-clamp-2">{p.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-brand-700 font-semibold">
                    {p.currency} {p.price}
                  </span>
                  <span className="text-xs text-slate-500">{p.durationHours || 8} h</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
