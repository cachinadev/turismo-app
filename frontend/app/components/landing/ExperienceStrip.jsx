// app/components/landing/ExperienceStrip.jsx
import Link from "next/link";
import { mediaUrl } from "@/app/lib/media";

export default function ExperienceStrip({ items = [] }) {
  return (
    <section className="py-12 bg-slate-50 border-t border-slate-100">
      <div className="container-default">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">Experiencias para ti</h2>
          <Link href="/packages" className="text-brand-700 font-medium">
            Explorar
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((p) => (
            <Link key={p._id} href={`/packages/${p.slug}`} className="card overflow-hidden">
              <img
                src={mediaUrl(p.media?.[0]?.url) || "https://picsum.photos/400/300"}
                alt={p.title}
                className="h-36 w-full object-cover"
              />
              <div className="card-body">
                <p className="font-semibold line-clamp-1">{p.title}</p>
                <p className="text-xs text-slate-500 line-clamp-1">{p.city}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
