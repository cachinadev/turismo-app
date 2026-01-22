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
 * 🧩 Helper: get nested key from object (e.g., "tourType.label")
 * ------------------------------------------------------ */
function getByPath(obj, path) {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = String(path || '').split('.');
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

/* ------------------------------------------------------
 * 📘 Translation loader (supports nested keys + fallbacks)
 * ------------------------------------------------------ */
function useLocalTranslations(locale) {
  const [msgs, setMsgs] = useState({});

  useEffect(() => {
    let mounted = true;
    async function loadMessages() {
      try {
        const mod = await import(`@/messages/${locale}.json`);
        const root = mod?.default || mod || {};
        const booking = root?.BookingForm || {};
        if (mounted) setMsgs(booking);
      } catch {
        console.warn(`⚠️ Missing translations for locale "${locale}"`);
        if (mounted) setMsgs({});
      }
    }
    loadMessages();
    return () => {
      mounted = false;
    };
  }, [locale]);

  const FALLBACKS = {
    antiSpam: 'Leave this field empty',
    date: 'Tour date',
    name: 'Full name',
    email: 'Email',
    phone: 'Phone',
    phonePlaceholder: '+1 555 123 456',
    country: 'Country',
    countryPlaceholder: 'Your country',
    adults: 'Adults',
    children: 'Children',
    notes: 'Notes',
    notesPlaceholder: 'Additional details, preferences, or questions',
    people: 'People',
    estimated: 'Estimated total',
    sending: 'Sending…',
    confirm: 'Confirm booking',
    consent: 'By submitting, you agree to be contacted by email or phone about your booking.',

    // Errors
    'error.noPackage': 'Package not available.',
    'error.noDate': 'Please choose a date.',
    'error.pastDate': 'Date cannot be in the past.',
    'error.noName': 'Please enter your name.',
    'error.noEmail': 'Please enter your email.',
    'error.invalidEmail': 'Please enter a valid email.',
    'error.noAdults': 'At least 1 adult is required.',
    'error.noPrice': 'Price not available for this package.',
    'error.submitFailed': 'Could not submit booking.',
    'error.unknown': 'Something went wrong.',

    // Success
    'success.sent': 'Booking request sent! We will contact you shortly.',

    // Tour type
    'tourType.label': 'Exclusive tour (private)',
    'tourType.short': 'Tour',
    'tourType.exclusive': 'Exclusive',
    'tourType.collective': 'Collective',
    'tourType.exclusiveHelp': 'Only you/your group will join this tour.',
    'tourType.collectiveHelp': 'You may share the tour with other travelers.',
  };

  const t = (key) => {
    const v = getByPath(msgs, key);
    if (typeof v === 'string' && v.trim()) return v;
    return FALLBACKS[key] || key;
  };

  return t;
}

/* ------------------------------------------------------
 * 💰 Price helpers (robust fallbacks)
 * ------------------------------------------------------ */
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(amount, currency = 'PEN') {
  const n = Number(amount);
  const val = Number.isFinite(n) ? n : 0;
  const cur = String(currency || 'PEN').toUpperCase();
  return `${cur} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Resolve frontend unit price with fallbacks:
 * - Supports promo: pkg.isPromoActive + pkg.effectivePrice
 * - Supports exclusive pricing: pkg.exclusivePrice / pkg.privatePrice
 * - Falls back to pkg.price
 */
function resolveUnitPrice(pkg, isExclusive) {
  const currency = String(pkg?.currency || 'PEN');

  // promo (if your API provides this)
  const promoActive = !!pkg?.isPromoActive && Number.isFinite(Number(pkg?.effectivePrice));
  const promoUnit = promoActive ? toNumber(pkg?.effectivePrice) : 0;

  // exclusive vs collective base
  const exclusiveBase =
    toNumber(pkg?.exclusivePrice) ||
    toNumber(pkg?.privatePrice) ||
    0;

  const collectiveBase =
    toNumber(pkg?.price) ||
    toNumber(pkg?.collectivePrice) ||
    0;

  // If promo is active, prefer promoUnit (but if promoUnit is 0, ignore it)
  if (promoActive && promoUnit > 0) {
    return { unit: promoUnit, currency, promoActive: true, base: isExclusive ? (exclusiveBase || collectiveBase) : collectiveBase };
  }

  // Otherwise choose by tour type
  const unit = isExclusive ? (exclusiveBase || collectiveBase) : collectiveBase;
  return { unit, currency, promoActive: false, base: isExclusive ? (exclusiveBase || collectiveBase) : collectiveBase };
}

/* ------------------------------------------------------
 * 🚀 BookingForm Component
 * ------------------------------------------------------ */
export default function BookingForm({ pkg }) {
  const pathname = usePathname() || '/';
  const firstSeg = pathname.split('/')[1] || DEFAULT_LOCALE;
  const currentLocale = SUPPORTED_LOCALES.includes(firstSeg) ? firstSeg : DEFAULT_LOCALE;

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
    isExclusive: false,
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: '', msg: '' });
  const [serverPricing, setServerPricing] = useState(null); // { unitPrice, totalPrice, currency }
  const honeypotRef = useRef(null);

  /* ---------- Pricing (UI estimate with robust fallbacks) ---------- */
  const totalPeople = Math.max(1, Number(form.adults || 0) + Number(form.children || 0));
  const pricing = useMemo(() => resolveUnitPrice(pkg, !!form.isExclusive), [pkg, form.isExclusive]);

  const uiUnitPrice = pricing.unit;
  const uiCurrency = pricing.currency;
  const uiTotal = uiUnitPrice * totalPeople;

  const hasValidPrice = uiUnitPrice > 0;

  const tourTypeLabel = form.isExclusive ? t('tourType.exclusive') : t('tourType.collective');

  /* ---------- Handlers ---------- */
  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? !!checked
          : type === 'number'
          ? value.replace(/[^\d]/g, '')
          : value,
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return t('error.invalidEmail');
    if (Number(form.adults || 0) < 1) return t('error.noAdults');

    // IMPORTANT: if price is not available, don’t submit.
    // (Remove this if you want to allow "price on request")
    if (!hasValidPrice) return t('error.noPrice');

    return null;
  }

  async function submit(e) {
    e.preventDefault();
    if (loading) return;
    setNotice({ type: '', msg: '' });
    setServerPricing(null);

    if (honeypotRef.current?.value) return;

    const errMsg = validate();
    if (errMsg) {
      setNotice({ type: 'error', msg: errMsg });
      return;
    }

    setLoading(true);
    try {
      const sourceUrl = typeof window !== 'undefined' ? window.location.href : '';

      // ✅ Do NOT send unitPrice/currency from frontend — backend is truth.
      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: pkg._id,
          date: form.date,
          people: {
            adults: Number(form.adults),
            children: Number(form.children),
          },
          tourType: form.isExclusive ? 'exclusive' : 'collective',
          isExclusive: !!form.isExclusive,
          customer: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            country: form.country.trim(),
            language: currentLocale,
          },
          notes: form.notes.trim(),
          sourceUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || t('error.submitFailed'));
      }

      // ✅ Show backend pricing (what will go into email)
      setServerPricing({
        unitPrice: data?.unitPrice ?? null,
        totalPrice: data?.totalPrice ?? null,
        currency: data?.currency || uiCurrency,
      });

      setNotice({
        type: 'success',
        msg:
          data?.reservationId
            ? `${t('success.sent')} (ID: ${data.reservationId})`
            : t('success.sent'),
      });

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
          <label className="label" htmlFor="date">{t('date')}</label>
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
            <label className="label" htmlFor="name">{t('name')}</label>
            <input id="name" name="name" value={form.name} onChange={onChange} className="input w-full" required disabled={loading} />
          </div>
          <div>
            <label className="label" htmlFor="email">{t('email')}</label>
            <input id="email" name="email" type="email" value={form.email} onChange={onChange} className="input w-full" required disabled={loading} />
          </div>
          <div>
            <label className="label" htmlFor="phone">{t('phone')}</label>
            <input id="phone" name="phone" value={form.phone} onChange={onChange} className="input w-full" placeholder={t('phonePlaceholder')} disabled={loading} />
          </div>
          <div>
            <label className="label" htmlFor="country">{t('country')}</label>
            <input id="country" name="country" value={form.country} onChange={onChange} className="input w-full" placeholder={t('countryPlaceholder')} disabled={loading} />
          </div>
        </div>

        {/* People */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="adults">{t('adults')}</label>
            <input id="adults" name="adults" type="number" min={1} value={form.adults} onChange={onChange} onBlur={clampNumbers} className="input w-full" disabled={loading} required />
          </div>
          <div>
            <label className="label" htmlFor="children">{t('children')}</label>
            <input id="children" name="children" type="number" min={0} value={form.children} onChange={onChange} onBlur={clampNumbers} className="input w-full" disabled={loading} />
          </div>
        </div>

        {/* Tour type */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-start gap-3">
            <input
              id="isExclusive"
              name="isExclusive"
              type="checkbox"
              checked={!!form.isExclusive}
              onChange={onChange}
              disabled={loading}
              className="mt-1 h-4 w-4"
            />
            <div className="flex-1">
              <label htmlFor="isExclusive" className="font-semibold text-slate-800 cursor-pointer">
                {t('tourType.label')}
              </label>
              <p className="text-xs text-slate-600 mt-1">
                {form.isExclusive ? t('tourType.exclusiveHelp') : t('tourType.collectiveHelp')}
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
              {tourTypeLabel}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label" htmlFor="notes">{t('notes')}</label>
          <textarea id="notes" name="notes" rows={4} value={form.notes} onChange={onChange} className="input w-full" placeholder={t('notesPlaceholder')} disabled={loading} />
        </div>

        {/* Total + Submit */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-slate-600">
            <div>
              {t('people')}: <span className="font-medium">{totalPeople}</span>
              <span className="mx-2">•</span>
              {t('tourType.short')}: <span className="font-medium">{tourTypeLabel}</span>
            </div>

            <div className="mt-1">
              {t('estimated')}:{' '}
              {hasValidPrice ? (
                <span className="font-semibold">{formatMoney(uiTotal, uiCurrency)}</span>
              ) : (
                <span className="font-semibold text-amber-700">{t('error.noPrice')}</span>
              )}
            </div>

            {/* Show backend truth after submit */}
            {serverPricing?.totalPrice != null && (
              <div className="mt-1 text-xs text-slate-500">
                Backend: <b>{formatMoney(serverPricing.totalPrice, serverPricing.currency)}</b> (unit: {formatMoney(serverPricing.unitPrice, serverPricing.currency)})
              </div>
            )}
          </div>

          <button className="btn btn-primary" disabled={loading || !pkg?._id || !hasValidPrice}>
            {loading ? t('sending') : t('confirm')}
          </button>
        </div>

        {/* Notices */}
        {notice.msg && (
          <p className={`text-sm ${notice.type === 'error' ? 'text-red-600' : 'text-green-700'}`} role="status">
            {notice.msg}
          </p>
        )}

        <p className="text-xs text-slate-500">{t('consent')}</p>
      </div>
    </form>
  );
}
