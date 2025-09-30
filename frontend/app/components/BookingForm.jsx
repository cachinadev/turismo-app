// frontend/app/components/BookingForm.jsx
'use client';

import { useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { API_BASE } from '@/app/lib/config';

export default function BookingForm({ pkg }) {
  const pathname = usePathname() || '/';

  /* ---------- Locale ---------- */
  const firstSeg = pathname.split('/')[1] || 'en';
  const currentLocale = /^[a-z]{2}(-[A-Za-z]{2})?$/.test(firstSeg) ? firstSeg : 'en';

  /* ---------- Dates ---------- */
  const todayISO = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  }, []);

  /* ---------- State ---------- */
  const [form, setForm] = useState({
    date: '',
    name: '',
    email: '',
    phone: '',
    country: '',
    adults: 1,
    children: 0,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: '', msg: '' });

  const honeypotRef = useRef(null); // spam trap

  /* ---------- Pricing ---------- */
  const price = Number(pkg?.price || 0);
  const currency = String(pkg?.currency || 'USD');
  const totalPeople = Number(form.adults || 0) + Number(form.children || 0);
  const uiTotal = price * Math.max(1, totalPeople || 1);

  /* ---------- Handlers ---------- */
  function onChange(e) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? value.replace(/[^\d]/g, '') : value,
    }));
  }

  function clampNumbers() {
    setForm((prev) => ({
      ...prev,
      adults: Math.max(1, Number(prev.adults || 1)),
      children: Math.max(0, Number(prev.children || 0)),
    }));
  }

  function validate() {
    if (!pkg?._id) return 'Package not found. Please refresh the page.';
    if (!form.date) return 'Select a date for the tour.';
    if (new Date(form.date) < new Date(todayISO)) return 'The date cannot be earlier than today.';
    if (!form.name.trim()) return 'Name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email.';
    if (Number(form.adults || 0) < 1) return 'There must be at least 1 adult.';
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    if (loading) return;
    setNotice({ type: '', msg: '' });

    // Honeypot: bots get discarded silently
    if (honeypotRef.current?.value) return;

    const errMsg = validate();
    if (errMsg) {
      setNotice({ type: 'error', msg: errMsg });
      return;
    }

    setLoading(true);
    try {
      const sourceUrl = typeof window !== 'undefined' ? window.location.href : '';

      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: pkg._id,
          packageMeta: {
            slug: pkg.slug,
            title: pkg.title,
            city: pkg.city,
          },
          date: form.date,
          people: {
            adults: Number(form.adults),
            children: Number(form.children),
          },
          customer: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            country: form.country.trim(),
            language: currentLocale,
          },
          notes: form.notes.trim(),
          unitPrice: price, // UI reference only
          currency,
          sourceUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Could not create the booking.');
      }

      setNotice({
        type: 'success',
        msg: 'Booking sent! Please check your email for confirmation (PDF attached).',
      });

      // Reset form but keep the selected date
      setForm((prev) => ({
        ...prev,
        name: '',
        email: '',
        phone: '',
        country: '',
        adults: 1,
        children: 0,
        notes: '',
      }));
    } catch (err) {
      setNotice({
        type: 'error',
        msg: err?.message || 'Booking could not be completed.',
      });
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Render ---------- */
  return (
    <form onSubmit={submit} className="card" noValidate>
      <div className="card-body space-y-4">

        {/* Honeypot */}
        <div className="hidden" aria-hidden>
          <label>
            If you are human, leave this field empty
            <input ref={honeypotRef} tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        {/* Date */}
        <div>
          <label className="label" htmlFor="date">Tour date</label>
          <input
            id="date"
            name="date"
            type="date"
            min={todayISO}
            value={form.date}
            onChange={onChange}
            className="input w-full"
            required
            disabled={loading}
          />
        </div>

        {/* Customer details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={onChange}
              className="input w-full"
              required
              disabled={loading}
              aria-invalid={!form.name.trim() ? 'true' : 'false'}
            />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              className="input w-full"
              required
              disabled={loading}
              aria-invalid={!form.email.trim() ? 'true' : 'false'}
            />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              value={form.phone}
              onChange={onChange}
              className="input w-full"
              placeholder="+1 555 123 4567"
              disabled={loading}
            />
          </div>
          <div>
            <label className="label" htmlFor="country">Country</label>
            <input
              id="country"
              name="country"
              value={form.country}
              onChange={onChange}
              className="input w-full"
              placeholder="USA"
              disabled={loading}
            />
          </div>
        </div>

        {/* People */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="adults">Adults</label>
            <input
              id="adults"
              name="adults"
              type="number"
              min={1}
              value={form.adults}
              onChange={onChange}
              onBlur={clampNumbers}
              className="input w-full"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="children">Children</label>
            <input
              id="children"
              name="children"
              type="number"
              min={0}
              value={form.children}
              onChange={onChange}
              onBlur={clampNumbers}
              className="input w-full"
              disabled={loading}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            value={form.notes}
            onChange={onChange}
            className="input w-full"
            placeholder="Additional details, preferred language, allergies, etc."
            disabled={loading}
          />
        </div>

        {/* Total & Submit */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            People: <span className="font-medium">{totalPeople || 1}</span>
            <span className="mx-2">•</span>
            Estimated:{' '}
            <span className="font-semibold">
              {currency}{' '}
              {uiTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <button className="btn btn-primary" disabled={loading || !pkg?._id}>
            {loading ? 'Sending…' : 'Confirm booking'}
          </button>
        </div>

        {/* Notice */}
        {notice.msg && (
          <p
            className={`text-sm ${
              notice.type === 'error' ? 'text-red-600' : 'text-green-700'
            }`}
            role="status"
            aria-live="polite"
          >
            {notice.msg}
          </p>
        )}

        <p className="text-xs text-slate-500">
          By submitting, you agree to be contacted by email or WhatsApp to confirm availability.
        </p>
      </div>
    </form>
  );
}
