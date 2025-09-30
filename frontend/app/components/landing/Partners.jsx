// app/components/landing/Partners.jsx
export default function Partners() {
  const logos = [
    "https://dummyimage.com/120x40/eee/aaa.png&text=Partner+1",
    "https://dummyimage.com/120x40/eee/aaa.png&text=Partner+2",
    "https://dummyimage.com/120x40/eee/aaa.png&text=Partner+3",
    "https://dummyimage.com/120x40/eee/aaa.png&text=Partner+4",
  ];
  return (
    <section className="py-10 bg-white">
      <div className="container-default">
        <p className="text-center text-slate-500 mb-6">Aliados y certificaciones</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 place-items-center">
          {logos.map((src, i) => (
            <img key={i} src={src} alt="logo" className="h-8 object-contain opacity-70" />
          ))}
        </div>
      </div>
    </section>
  );
}
