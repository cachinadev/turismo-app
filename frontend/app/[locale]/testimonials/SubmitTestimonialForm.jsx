"use client";

import { useMemo, useState } from "react";
import { API_BASE, withBase } from "@/app/lib/config";

const ENDPOINT = withBase(API_BASE, "/api/testimonials");

const DEFAULTS = {
  name: "",
  country: "",
  reservationId: "",
  rating: 5,
  title: "",
  message: "",
  packageSlug: "",
  honeypot: "",
};

export default function SubmitTestimonialForm({ locale = "en" }) {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: "", msg: "" });
  const [verified, setVerified] = useState(false);
  const [lookupMsg, setLookupMsg] = useState("");

  const labels = useMemo(() => {
    const lang = String(locale || "en").toLowerCase();
    const key = ["es", "en", "pt", "fr", "ru"].includes(lang) ? lang : "en";
    const dict = {
      es: {
        title: "Comparte tu experiencia",
        subtitle: "Tu reseña aparecerá después de ser verificada.",
        name: "Nombre",
        country: "País",
        reservationId: "ID de reserva (opcional)",
        rating: "Calificación",
        titleField: "Título",
        message: "Comentario",
        packageSlug: "Paquete (slug, opcional)",
        submit: "Enviar reseña",
        sending: "Enviando…",
        success: "¡Gracias! Revisaremos tu reseña.",
        error: "No se pudo enviar la reseña.",
        verified: "Reserva verificada",
        lookupOk: "Reserva encontrada. Paquete completado.",
        lookupVerified: "Reserva verificada (finalizada)",
        lookupNotFound: "No se encontró la reserva.",
      },
      en: {
        title: "Share your experience",
        subtitle: "Your review will appear after verification.",
        name: "Name",
        country: "Country",
        reservationId: "Reservation ID (optional)",
        rating: "Rating",
        titleField: "Title",
        message: "Message",
        packageSlug: "Package (slug, optional)",
        submit: "Submit testimonial",
        sending: "Submitting…",
        success: "Thanks! We’ll review your testimonial.",
        error: "Could not submit testimonial.",
        verified: "Verified booking",
        lookupOk: "Booking found. Package filled.",
        lookupVerified: "Verified booking (completed)",
        lookupNotFound: "Reservation not found.",
      },
      pt: {
        title: "Compartilhe sua experiência",
        subtitle: "Sua avaliação aparecerá após a verificação.",
        name: "Nome",
        country: "País",
        reservationId: "ID da reserva (opcional)",
        rating: "Avaliação",
        titleField: "Título",
        message: "Mensagem",
        packageSlug: "Pacote (slug, opcional)",
        submit: "Enviar avaliação",
        sending: "Enviando…",
        success: "Obrigado! Vamos revisar sua avaliação.",
        error: "Não foi possível enviar a avaliação.",
        verified: "Reserva verificada",
        lookupOk: "Reserva encontrada. Pacote preenchido.",
        lookupVerified: "Reserva verificada (finalizada)",
        lookupNotFound: "Reserva não encontrada.",
      },
      fr: {
        title: "Partagez votre expérience",
        subtitle: "Votre avis apparaîtra après vérification.",
        name: "Nom",
        country: "Pays",
        reservationId: "ID de réservation (optionnel)",
        rating: "Note",
        titleField: "Titre",
        message: "Message",
        packageSlug: "Forfait (slug, optionnel)",
        submit: "Envoyer l’avis",
        sending: "Envoi…",
        success: "Merci ! Nous allons examiner votre avis.",
        error: "Impossible d’envoyer l’avis.",
        verified: "Réservation vérifiée",
        lookupOk: "Réservation trouvée. Forfait rempli.",
        lookupVerified: "Réservation vérifiée (terminée)",
        lookupNotFound: "Réservation introuvable.",
      },
      ru: {
        title: "Поделитесь впечатлением",
        subtitle: "Ваш отзыв появится после проверки.",
        name: "Имя",
        country: "Страна",
        reservationId: "ID бронирования (необязательно)",
        rating: "Оценка",
        titleField: "Заголовок",
        message: "Сообщение",
        packageSlug: "Пакет (slug, необязательно)",
        submit: "Отправить отзыв",
        sending: "Отправка…",
        success: "Спасибо! Мы проверим ваш отзыв.",
        error: "Не удалось отправить отзыв.",
        verified: "Бронирование подтверждено",
        lookupOk: "Бронирование найдено. Пакет заполнен.",
        lookupVerified: "Бронирование подтверждено (завершено)",
        lookupNotFound: "Бронирование не найдено.",
      },
    };
    return dict[key] || dict.en;
  }, [locale]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setNotice({ type: "", msg: "" });
    setVerified(false);
    if (form.honeypot) return;
    if (!form.message.trim()) {
      setNotice({ type: "error", msg: labels.error });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          country: form.country.trim(),
          reservationId: form.reservationId.trim(),
          rating: Number(form.rating || 5),
          title: form.title.trim(),
          message: form.message.trim(),
          packageSlug: form.packageSlug.trim(),
        }),
      });

      if (!res.ok) throw new Error("submit_failed");
      const data = await res.json().catch(() => ({}));

      setNotice({ type: "success", msg: labels.success });
      if (data?.approved) setVerified(true);
      setForm(DEFAULTS);
    } catch {
      setNotice({ type: "error", msg: labels.error });
    } finally {
      setLoading(false);
    }
  };

  const onReservationBlur = async () => {
    const id = form.reservationId.trim();
    setLookupMsg("");
    if (!id) return;
    const isValid = /^VA-\d{8}-[A-Z0-9]{6}$/i.test(id);
    if (!isValid) return;

    try {
      const res = await fetch(`${API_BASE}/api/bookings/lookup?reservationId=${encodeURIComponent(id)}`);
      if (!res.ok) {
        setLookupMsg(labels.lookupNotFound);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data?.packageSlug) {
        setForm((prev) => ({ ...prev, packageSlug: data.packageSlug }));
      }
      const isFinal = String(data?.status || "").toLowerCase() === "finalizado";
      if (isFinal) setVerified(true);
      setLookupMsg(isFinal ? labels.lookupVerified : labels.lookupOk);
    } catch {
      // ignore lookup errors
    }
  };

  return (
    <form onSubmit={onSubmit} className="card">
      <div className="card-body space-y-4">
        <div>
          <h3 className="text-lg font-semibold">{labels.title}</h3>
          <p className="text-sm text-slate-600">{labels.subtitle}</p>
        </div>

        <div className="hidden" aria-hidden>
          <label>
            Leave this field empty
            <input name="honeypot" value={form.honeypot} onChange={onChange} tabIndex={-1} />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">{labels.name}</label>
            <input className="input w-full" name="name" value={form.name} onChange={onChange} />
          </div>
          <div>
            <label className="label">{labels.country}</label>
            <input className="input w-full" name="country" value={form.country} onChange={onChange} />
          </div>
        </div>

        <div>
          <label className="label">{labels.reservationId}</label>
          <input
            className="input w-full"
            name="reservationId"
            value={form.reservationId}
            onChange={onChange}
            onBlur={onReservationBlur}
            placeholder="VA-20260131-ZEWI85"
          />
          {lookupMsg ? <p className="text-xs text-slate-500 mt-1">{lookupMsg}</p> : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="label">{labels.rating}</label>
            <select className="input w-full" name="rating" value={form.rating} onChange={onChange}>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} ★
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">{labels.titleField}</label>
            <input className="input w-full" name="title" value={form.title} onChange={onChange} />
          </div>
        </div>

        <div>
          <label className="label">{labels.message}</label>
          <textarea
            className="input w-full"
            rows={4}
            name="message"
            value={form.message}
            onChange={onChange}
            required
          />
        </div>

        <div>
          <label className="label">{labels.packageSlug}</label>
          <input className="input w-full" name="packageSlug" value={form.packageSlug} onChange={onChange} />
        </div>

        {notice.msg && (
          <p className={`text-sm ${notice.type === "error" ? "text-red-600" : "text-green-700"}`} role="status">
            {notice.msg}
          </p>
        )}
        {verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-200 text-xs">
            ✔ {labels.verified}
          </span>
        ) : null}

        <button className="btn btn-primary" disabled={loading}>
          {loading ? labels.sending : labels.submit}
        </button>
      </div>
    </form>
  );
}
