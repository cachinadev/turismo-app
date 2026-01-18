//frontend/app/[locale]/complaints/page.js
"use client";

import { useState } from "react";
import Image from "next/image";

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@vicuadvent.com";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function ComplaintsPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    documentType: "DNI",
    documentNumber: "",
    service: "",
    description: "",
    type: "Reclamo",
  });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setSending(true);
    setStatus(null);

    try {
      const res = await fetch(`${API_BASE}/api/complaints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("API error");

      setStatus({
        type: "success",
        text: "✅ Tu reclamo ha sido registrado correctamente. Pronto nos pondremos en contacto contigo.",
      });
      setForm({
        name: "",
        email: "",
        phone: "",
        documentType: "DNI",
        documentNumber: "",
        service: "",
        description: "",
        type: "Reclamo",
      });
    } catch (err) {
      const subject = encodeURIComponent(`Libro de Reclamaciones: ${form.name}`);
      const body = encodeURIComponent(
        `Nombre: ${form.name}\nEmail: ${form.email}\nTeléfono: ${form.phone}\nTipo: ${form.type}\nServicio: ${form.service}\nDescripción: ${form.description}`
      );
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      setStatus({
        type: "error",
        text: "⚠️ No se pudo enviar automáticamente. Abriendo tu cliente de correo…",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <section className="container-default py-12 px-4 max-w-3xl mx-auto">
        {/* --- Header Section --- */}
        <div className="text-center mb-8">
          <Image
            src="/reclamos.jpg"
            alt="Libro de Reclamaciones"
            width={260}
            height={140}
            className="mx-auto rounded-md shadow-sm mb-4 border border-slate-200"
          />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Libro de Reclamaciones Virtual
          </h1>
          <p className="text-slate-600 text-sm max-w-2xl mx-auto">
            Conforme al <strong>D.S. N° 011-2011-PCM</strong>, VICUÑA ADVENTURES S.A.C.
            pone a disposición este libro virtual para que los consumidores
            registren un <strong>Reclamo</strong> (disconformidad con el producto o
            servicio) o una <strong>Queja</strong> (malestar no relacionado directamente
            con el producto o servicio).
          </p>
        </div>

        {/* --- Form Section --- */}
        <form
          onSubmit={onSubmit}
          className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-5"
        >
          <h2 className="text-lg font-semibold text-slate-800 mb-2">
            📝 Formulario de Registro
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre completo *
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
                name="name"
                required
                value={form.name}
                onChange={onChange}
                disabled={sending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Correo electrónico *
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
                type="email"
                name="email"
                required
                value={form.email}
                onChange={onChange}
                disabled={sending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Teléfono
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
                name="phone"
                value={form.phone}
                onChange={onChange}
                disabled={sending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de documento
              </label>
              <select
                className="w-full border rounded-md px-3 py-2 text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
                name="documentType"
                value={form.documentType}
                onChange={onChange}
                disabled={sending}
              >
                <option>DNI</option>
                <option>Pasaporte</option>
                <option>CE</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                N° de documento *
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
                name="documentNumber"
                required
                value={form.documentNumber}
                onChange={onChange}
                disabled={sending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo *
              </label>
              <select
                className="w-full border rounded-md px-3 py-2 text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
                name="type"
                value={form.type}
                onChange={onChange}
                disabled={sending}
              >
                <option>Reclamo</option>
                <option>Queja</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Servicio o producto *
            </label>
            <input
              className="w-full border rounded-md px-3 py-2 text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
              name="service"
              required
              value={form.service}
              onChange={onChange}
              disabled={sending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descripción del reclamo o queja *
            </label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
              rows={6}
              name="description"
              required
              value={form.description}
              onChange={onChange}
              placeholder="Describe brevemente los hechos y la solución que solicitas…"
              disabled={sending}
            />
          </div>

          <div className="pt-2">
            <button
              className={`w-full sm:w-auto px-5 py-2.5 rounded-md font-semibold text-white shadow-sm transition-colors ${
                sending
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-700 hover:bg-green-800"
              }`}
              disabled={sending}
            >
              {sending ? "Enviando..." : "Enviar Reclamo"}
            </button>
          </div>

          {status && (
            <p
              className={`text-sm mt-3 ${
                status.type === "success"
                  ? "text-green-700"
                  : "text-red-600"
              }`}
              role="status"
              aria-live="polite"
            >
              {status.text}
            </p>
          )}
        </form>

        <p className="text-xs text-center text-slate-500 mt-8">
          Este establecimiento cuenta con un Libro de Reclamaciones Virtual
          conforme al <strong>D.S. N° 011-2011-PCM</strong>.
        </p>
      </section>
    </main>
  );
}
