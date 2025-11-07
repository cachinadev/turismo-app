// frontend/app/components/BookingForm.jsx
'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { API_BASE } from '@/app/lib/config';

/* ------------------------------------------------------
 * 🌍 Supported locales
 * ------------------------------------------------------ */
const SUPPORTED_LOCALES = ['es', 'en', 'fr', 'pt', 'ru'];
const DEFAULT_LOCALE = 'en';

/* ------------------------------------------------------
 * 📘 Translation loader
 * ------------------------------------------------------ */
function useLocalTranslations(locale) {
  const [t, setT] = useState(() => (key) => key);

  useEffect(() => {
    async function loadMessages() {
      try {
        const mod = await import(`@/messages/${locale}.json`);
        const msgs = mod.BookingForm || {};
        setT(() => (key) => msgs[key] || key);
      } catch {
        console.warn(`⚠️ Missing translations for locale "${locale}"`);
        setT(() => (key) => key);
      }
    }
    loadMessages();
  }, [locale]);

  return t;
}

/* ------------------------------------------------------
 * 🚀 BookingForm Component
 * ------------------------------------------------------ */
export default function BookingForm({ pkg }) {
  const pathname = usePathname() || '/';
  const firstSeg = pathname.split('/')[1] || DEFAULT_LOCALE;
  const currentLocale = SUPPORTED_LOCALES.includes(firstSeg)
    ? firstSeg
    : DEFAULT_LOCALE;

  const t = useLocalTranslations(currentLocale);

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
  const honeypotRef = useRef(null);

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
    if (!pkg?._id) return t('error.noPackage');
    if (!form.date) return t('error.noDate');
    if (new Date(form.date) < new Date(todayISO)) return t('error.pastDate');
    if (!form.name.trim()) return t('error.noName');
    if (!form.email.trim()) return t('error.noEmail');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return t('error.invalidEmail');
    if (Number(form.adults || 0) < 1) return t('error.noAdults');
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    if (loading) return;
    setNotice({ type: '', msg: '' });

    if (honeypotRef.current?.value) return; // spam trap

    const errMsg = validate();
    if (errMsg) {
      setNotice({ type: 'error', msg: errMsg });
      return;
    }

    setLoading(true);
    try {
      const sourceUrl =
        typeof window !== 'undefined' ? window.location.href : '';

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
          unitPrice: price,
          currency,
          sourceUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || t('error.submitFailed'));
      }

      setNotice({ type: 'success', msg: t('success.sent') });

      // Reset form (keep selected date)
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
      setNotice({ type: 'error', msg: err?.message || t('error.unknown') });
    } finally {
      setLoading(false);
    }
  }

  /* ---------- UI ---------- */
  return (
    <form onSubmit={submit} className="card" noValidate>
      <div className="card-body space-y-4">
        {/* Honeypot */}
        <div className="hidden" aria-hidden>
          <label>
            {t('antiSpam')}
            <input ref={honeypotRef} tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        {/* Date */}
        <div>
          <label className="label" htmlFor="date">
            {t('date')}
          </label>
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

        {/* Customer info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="name">
              {t('name')}
            </label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={onChange}
              className="input w-full"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="label" htmlFor="email">
              {t('email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              className="input w-full"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              {t('phone')}
            </label>
            <input
              id="phone"
              name="phone"
              value={form.phone}
              onChange={onChange}
              className="input w-full"
              placeholder={t('phonePlaceholder')}
              disabled={loading}
            />
          </div>
          <div>
            <label className="label" htmlFor="country">
              {t('country')}
            </label>
            <input
              id="country"
              name="country"
              value={form.country}
              onChange={onChange}
              className="input w-full"
              placeholder={t('countryPlaceholder')}
              disabled={loading}
            />
          </div>
        </div>

        {/* People */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="adults">
              {t('adults')}
            </label>
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
            <label className="label" htmlFor="children">
              {t('children')}
            </label>
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
          <label className="label" htmlFor="notes">
            {t('notes')}
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            value={form.notes}
            onChange={onChange}
            className="input w-full"
            placeholder={t('notesPlaceholder')}
            disabled={loading}
          />
        </div>

        {/* Total + Submit */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {t('people')}: <span className="font-medium">{totalPeople || 1}</span>
            <span className="mx-2">•</span>
            {t('estimated')}:{' '}
            <span className="font-semibold">
              {currency}{' '}
              {uiTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <button className="btn btn-primary" disabled={loading || !pkg?._id}>
            {loading ? t('sending') : t('confirm')}
          </button>
        </div>

        {/* Notices */}
        {notice.msg && (
          <p
            className={`text-sm ${
              notice.type === 'error' ? 'text-red-600' : 'text-green-700'
            }`}
            role="status"
          >
            {notice.msg}
          </p>
        )}

        <p className="text-xs text-slate-500">
          {t('consent')}
        </p>
      </div>
    </form>
  );
}
