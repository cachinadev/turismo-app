// app/components/landing/CategoryStrip.jsx
import Link from "next/link";

const cats = [
  {
    k: "full",
    t: "Full Day",
    img: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200",
  },
  {
    k: "classic",
    t: "Clásicos",
    img: "https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=1200",
  },
  {
    k: "adventure",
    t: "Aventura",
    img: "https://images.unsplash.com/photo-1500043357865-c6b8827edf23?q=80&w=1200",
  },
  {
    k: "exclusive",
    t: "Privados",
    img: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?q=80&w=1200",
  },
];

export default function CategoryStrip() {
  return (
    <section className="py-10">
      <div className="container-default">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">Explora por categoría</h2>
          <Link href="/packages" className="text-brand-700 font-medium">
            Ver todos
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cats.map((c) => (
            <Link
              key={c.k}
              href={{ pathname: "/packages", query: { category: c.k } }}
              className="group card overflow-hidden"
            >
              <div className="relative">
                <img
                  src={c.img}
                  alt={c.t}
                  className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-0 p-3 text-white">
                  <p className="font-semibold drop-shadow">{c.t}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
