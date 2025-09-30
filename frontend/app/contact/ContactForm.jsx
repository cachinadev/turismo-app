// app/contact/ContactForm.jsx
"use client";

import { useState } from "react";

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@vicuadvent.com";
const CONTACT_PHONE =
  process.env.NEXT_PUBLIC_CONTACT_PHONE || "+51 989 765 432";
const WHATSAPP_LINK = process.env.NEXT_PUBLIC_WHATSAPP_LINK || "";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function buildWhatsAppLink({ name, email, phone, message }) {
  const base =
    WHATSAPP_LINK ||
    `https://wa.me/${String(CONTACT_PHONE || "").replace(/\D/g, "")}`;
  const txt = encodeURIComponent(
    `Hello, I'm ${name || "—"}.\nEmail: ${email || "—"}\nPhone: ${
      phone || "—"
    }\n\n${message || ""}`
  );
  return `${base}?text=${txt}`;
}

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success" | "error", text: string }

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setSending(true);
    setStatus(null);

    const payload = {
      ...form,
      pageUrl: typeof window !== "undefined" ? window.location.href : "",
    };

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("API error");

      setStatus({
        type: "success",
        text: "✅ Message sent! We will get back to you shortly.",
      });
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      // fallback: open mail client
      const subject = encodeURIComponent(
        `Website contact: ${form.name || ""}`
      );
      const body = encodeURIComponent(
        `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\n\n${form.message}`
      );
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      setStatus({
        type: "error",
        text: "⚠️ Could not send via the form. Trying to open your email client…",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            className="input"
            name="name"
            value={form.name}
            onChange={onChange}
            required
            disabled={sending}
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            required
            disabled={sending}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="phone">
          Phone
        </label>
        <input
          id="phone"
          className="input"
          name="phone"
          value={form.phone}
          onChange={onChange}
          disabled={sending}
        />
      </div>

      <div>
        <label className="label" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          className="input"
          rows={6}
          name="message"
          value={form.message}
          onChange={onChange}
          placeholder="Dates, number of people, destinations of interest…"
          required
          disabled={sending}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={sending}>
          {sending ? "Sending…" : "Send message"}
        </button>
        <a
          className="btn btn-ghost"
          href={buildWhatsAppLink(form)}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      </div>

      {status && (
        <p
          className={`text-sm ${
            status.type === "success" ? "text-green-700" : "text-red-600"
          }`}
          role="status"
          aria-live="polite"
        >
          {status.text}
        </p>
      )}
    </form>
  );
}
