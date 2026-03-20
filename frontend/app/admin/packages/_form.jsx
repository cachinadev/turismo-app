// frontend/app/admin/packages/_form.jsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Uploader from './_uploader';
import { mediaUrl, mediaVariantUrl } from '@/app/lib/media';
import { API_BASE } from '@/app/lib/config';

const EMPTY = {
  title: '',
  description: '',
  city: 'Puno',
  country: 'Perú',
  category: 'Tour',
  price: 0,
  exclusivePrice: '',
  currency: 'PEN',
  durationDays: 0,
  durationHours: 8,
  dailyCapacity: '',
  languages: 'es,en',
  transport: 'Van',
  guideLanguages: 'es,en',

  // Lists (one per line)
  highlights: '',
  includes: '',
  excludes: '',
  whatToBring: '',
  recommendations: '',

  // Status / media
  active: true,
  media: [],
  brochurePdf: null,

  // Map coords (optional)
  lat: '',
  lng: '',

  // New: Maps link + points
  mapsUrl: '',
  meetingPoint: '',
  dropoffPoint: '',

  // New: constraints
  difficulty: 'Fácil', // Fácil | Moderado | Difícil
  ageMin: '',
  minPeople: '',
  maxPeople: '',

  // New: schedule
  startTimes: '08:00', // comma-separated times
  availableDays: 'Lun,Mar,Mié,Jue,Vie,Sáb,Dom', // comma-separated

  // New: itinerary (dynamic list)
  itinerary: [
    // { time: "08:00", title: "Recojo", details: "Hotel en el centro", durationMin: 15, location: "", mapsUrl: "" }
  ],

  // Promo
  isPromo: false,
  promoPercent: '',
  promoPrice: '',
  promoStartAt: '',
  promoEndAt: '',
};

const CITIES = ['Puno', 'Cusco', 'Lima', 'Arequipa', 'Otros'];
const CURRENCIES = ['PEN', 'USD'];
const DIFFICULTY = ['Fácil', 'Moderado', 'Difícil'];
const TRANSPORT_OPTIONS = ['Van', 'Bus', 'Private van', 'Shared minivan', 'Boat', 'Train', 'Plane', 'Other'];
const DURATION_MIN = 1;
const DURATION_MAX = 240;

// ---- helpers
const toNumber = (v, def = 0) => (Number.isFinite(Number(v)) ? Number(v) : def);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const parseLines = (v, sepRe = /\r?\n/) =>
  Array.from(new Set(String(v || '').split(sepRe).map((s) => s.trim()).filter(Boolean)));
const parseLanguages = (v) =>
  Array.from(new Set(String(v || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)));
const parseComma = (v) =>
  Array.from(new Set(String(v || '').split(',').map((s) => s.trim()).filter(Boolean)));

const isValidHttpUrl = (url) => {
  if (!url) return true; // allow empty
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const dedupeByUrlType = (list = []) => {
  const seen = new Set();
  const out = [];
  for (const m of list) {
    const key = `${m.type || 'image'}|${(m.url || '').trim()}`;
    if (!m.url || seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
};

const makeMapsQueryUrlFromCoords = (lat, lng) => {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${la},${lo}`)}`;
};

function ItineraryEditor({ value, onChange, disabled }) {
  const list = Array.isArray(value) ? value : [];

  const setStep = (idx, patch) => {
    const next = [...list];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const addStep = () => {
    onChange([
      ...list,
      {
        time: '',
        title: '',
        details: '',
        day: '',
        durationHours: '',
        durationMinutes: '',
        location: '',
        transport: '',
        guideLanguages: '',
        mapsUrl: '',
      },
    ]);
  };

  const removeStep = (idx) => {
    onChange(list.filter((_, i) => i !== idx));
  };

  const moveStep = (idx, delta) => {
    const target = idx + delta;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Itinerary steps</div>
          <div className="text-xs text-slate-500">Capture each step with time, duration, transport, guide languages, location and Maps link.</div>
        </div>
        <button type="button" className="btn btn-ghost" onClick={addStep} disabled={disabled}>
          + Add step
        </button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-slate-600 bg-slate-50">
          No itinerary steps yet. Click <b>Add step</b> to build the experience.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((step, idx) => (
            <div key={idx} className="rounded-2xl border bg-white">
              <div className="p-3 border-b flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">
                  Step {idx + 1} {step?.day ? `· Day ${step.day}` : ''} {step?.title ? `· ${step.title}` : ''}
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-ghost !px-2" onClick={() => moveStep(idx, -1)} disabled={disabled || idx === 0}>↑</button>
                  <button type="button" className="btn btn-ghost !px-2" onClick={() => moveStep(idx, +1)} disabled={disabled || idx === list.length - 1}>↓</button>
                  <button type="button" className="btn btn-ghost text-red-700 hover:bg-red-50" onClick={() => removeStep(idx)} disabled={disabled}>Remove</button>
                </div>
              </div>

              <div className="p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="md:col-span-1">
                    <label className="label">Time</label>
                    <input className="input" placeholder="08:00" value={step.time || ''} onChange={(e) => setStep(idx, { time: e.target.value })} disabled={disabled} />
                  </div>
                  <div className="md:col-span-3">
                    <label className="label">Title</label>
                    <input className="input" placeholder="Pickup / Boat ride / Lunch..." value={step.title || ''} onChange={(e) => setStep(idx, { title: e.target.value })} disabled={disabled} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Location (optional)</label>
                    <input className="input" placeholder="Uros, Taquile, Plaza de Armas..." value={step.location || ''} onChange={(e) => setStep(idx, { location: e.target.value })} disabled={disabled} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="md:col-span-1">
                    <label className="label">Day</label>
                    <input type="number" min={1} max={365} placeholder="1" className="input" value={step.day ?? ''} onChange={(e) => setStep(idx, { day: e.target.value })} disabled={disabled} />
                  </div>
                  <div className="md:col-span-1">
                    <label className="label">Hours</label>
                    <input type="number" min={0} max={48} placeholder="1" className="input" value={step.durationHours ?? ''} onChange={(e) => setStep(idx, { durationHours: e.target.value })} disabled={disabled} />
                  </div>
                  <div className="md:col-span-1">
                    <label className="label">Minutes</label>
                    <input type="number" min={0} max={59} placeholder="30" className="input" value={step.durationMinutes ?? ''} onChange={(e) => setStep(idx, { durationMinutes: e.target.value })} disabled={disabled} />
                  </div>
                  <div className="md:col-span-3">
                    <label className="label text-orange-600">Transport (required)</label>
                    <select className="input" value={step.transport || ''} onChange={(e) => setStep(idx, { transport: e.target.value })} disabled={disabled}>
                      <option value="">Select transport...</option>
                      {TRANSPORT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Details</label>
                  <input className="input" placeholder="What happens in this step..." value={step.details || ''} onChange={(e) => setStep(idx, { details: e.target.value })} disabled={disabled} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-3">
                    <label className="label">Maps link</label>
                    <input className="input" placeholder="https://maps.app.goo.gl/..." value={step.mapsUrl || ''} onChange={(e) => setStep(idx, { mapsUrl: e.target.value })} disabled={disabled} />
                    {step.mapsUrl && !isValidHttpUrl(step.mapsUrl) && (
                      <p className="text-xs text-red-600 mt-1">Invalid URL</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Guide languages</label>
                    <input className="input" placeholder="es,en,de" value={step.guideLanguages || ''} onChange={(e) => setStep(idx, { guideLanguages: e.target.value })} disabled={disabled} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PackageForm({ pkg, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [deleteErr, setDeleteErr] = useState('');
  const [brochureUploading, setBrochureUploading] = useState(false);
  const [brochureErr, setBrochureErr] = useState('');

  // Load edit values (or reset for new)
  useEffect(() => {
    if (!pkg) {
      setForm(EMPTY);
      return;
    }

    setForm({
      ...EMPTY,
      title: pkg.title ?? '',
      description: pkg.description ?? '',
      city: CITIES.includes(pkg.city) ? pkg.city : 'Puno',
      country: pkg.country ?? 'Perú',
      category: pkg.category ?? 'Tour',
      price: Number(pkg.price ?? 0),
      exclusivePrice: pkg?.exclusivePrice ?? '',
      currency: CURRENCIES.includes(pkg.currency) ? pkg.currency : 'PEN',
      durationHours: (() => {
        const total = Math.max(0, Number(pkg.durationHours ?? 8));
        return total - Math.floor(total / 24) * 24;
      })(),
      durationDays: (() => {
        const total = Math.max(0, Number(pkg.durationHours ?? 8));
        return Math.floor(total / 24);
      })(),
      dailyCapacity: (pkg?.dailyCapacity ?? '') + '',
      languages: Array.isArray(pkg.languages) ? pkg.languages.join(',') : 'es,en',
      transport: pkg?.transport || 'Van',
      guideLanguages: Array.isArray(pkg?.guideLanguages)
        ? pkg.guideLanguages.join(', ')
        : pkg?.guideLanguages || 'es,en',
      highlights: Array.isArray(pkg.highlights) ? pkg.highlights.join('\n') : '',
      includes: Array.isArray(pkg.includes) ? pkg.includes.join('\n') : '',
      excludes: Array.isArray(pkg.excludes) ? pkg.excludes.join('\n') : '',

      whatToBring: Array.isArray(pkg.whatToBring) ? pkg.whatToBring.join('\n') : (pkg.whatToBring ?? ''),
      recommendations: Array.isArray(pkg.recommendations) ? pkg.recommendations.join('\n') : (pkg.recommendations ?? ''),

      active: Boolean(pkg.active ?? true),
      media: Array.isArray(pkg.media) ? pkg.media : [],
      brochurePdf: pkg?.brochurePdf || null,

      lat: (pkg?.location?.lat ?? pkg?.lat ?? '') + '',
      lng: (pkg?.location?.lng ?? pkg?.lng ?? '') + '',

      mapsUrl: pkg?.mapsUrl ?? '',
      meetingPoint: pkg?.meetingPoint ?? '',
      dropoffPoint: pkg?.dropoffPoint ?? '',

      difficulty: DIFFICULTY.includes(pkg?.difficulty) ? pkg.difficulty : 'Fácil',
      ageMin: (pkg?.ageMin ?? '') + '',
      minPeople: (pkg?.minPeople ?? '') + '',
      maxPeople: (pkg?.maxPeople ?? '') + '',

      startTimes: Array.isArray(pkg?.startTimes) ? pkg.startTimes.join(', ') : (pkg?.startTimes ?? '08:00'),
      availableDays: Array.isArray(pkg?.availableDays) ? pkg.availableDays.join(', ') : (pkg?.availableDays ?? 'Lun,Mar,Mié,Jue,Vie,Sáb,Dom'),

      itinerary: Array.isArray(pkg?.itinerary) ? pkg.itinerary : [],

      isPromo: Boolean(pkg?.isPromo ?? false),
      promoPercent: (pkg?.promoPercent ?? '') + '',
      promoPrice: (pkg?.promoPrice ?? '') + '',
      promoStartAt: (pkg?.promoStartAt ?? '').slice(0, 10),
      promoEndAt: (pkg?.promoEndAt ?? '').slice(0, 10),
    });
  }, [pkg]);

  const setField = useCallback((k, v) => setForm((prev) => ({ ...prev, [k]: v })), []);

  // Build safe payload the backend expects
  const bodyPayload = useMemo(() => {
    const price = Math.max(0, toNumber(form.price, 0));
    const exclusivePrice = form.exclusivePrice === '' ? undefined : Math.max(0, toNumber(form.exclusivePrice, 0));
    const durationDays = Math.max(0, toNumber(form.durationDays, 0));
    const durationHoursInput = clamp(toNumber(form.durationHours, 0), 0, 23);
    const combinedDuration = durationDays * 24 + durationHoursInput;
    const duration = clamp(combinedDuration, DURATION_MIN, DURATION_MAX);
    const dailyCapacity =
      form.dailyCapacity === '' ? undefined : Math.max(0, toNumber(form.dailyCapacity, 0));
    const currency = CURRENCIES.includes(form.currency) ? form.currency : 'PEN';

    // sanitize media
    const safeMedia = Array.isArray(form.media)
      ? dedupeByUrlType(
          form.media
            .filter((m) => m && m.url && (m.type === 'image' || m.type === 'video'))
            .map(({ url, type, caption, relativePath, width, height, variants }) => ({
              url,
              type,
              ...(caption ? { caption } : {}),
              ...(relativePath ? { relativePath } : {}),
              ...(Number.isFinite(Number(width)) ? { width: Number(width) } : {}),
              ...(Number.isFinite(Number(height)) ? { height: Number(height) } : {}),
              ...(variants && typeof variants === 'object' ? { variants } : {}),
            }))
        )
      : [];

    const latNum = Number(form.lat);
    const lngNum = Number(form.lng);
    const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);
    const safeLat = hasCoords ? clamp(latNum, -90, 90) : undefined;
    const safeLng = hasCoords ? clamp(lngNum, -180, 180) : undefined;

    const isPromo = !!form.isPromo;
    const promoPercent = clamp(toNumber(form.promoPercent, 0), 0, 100);
    const promoPrice = Math.max(0, toNumber(form.promoPrice, 0));
    const promoStartAt = form.promoStartAt ? new Date(form.promoStartAt).toISOString() : undefined;
    const promoEndAt = form.promoEndAt ? new Date(form.promoEndAt).toISOString() : undefined;

    const transport = String(form.transport || '').trim();
    const guideLanguagesList = parseLanguages(form.guideLanguages);

    const itinerarySafe = Array.isArray(form.itinerary)
      ? form.itinerary
          .map((s) => {
            const durationMin =
              s?.durationMin === '' ? undefined : Math.max(0, toNumber(s?.durationMin, 0));
            const durationHours =
              s?.durationHours === '' ? undefined : clamp(toNumber(s?.durationHours, 0), 0, 48);
            const durationMinutes =
              s?.durationMinutes === '' ? undefined : clamp(toNumber(s?.durationMinutes, 0), 0, 59);
            const day = s?.day === '' ? undefined : Math.max(1, toNumber(s?.day, 1));
            const stepTransport = String(s?.transport || '').trim();
            const stepGuideLanguages = parseLanguages(s?.guideLanguages);
            const computedDurationMin =
              durationMin ??
              (Number.isFinite(durationHours) || Number.isFinite(durationMinutes)
                ? Math.max(0, (durationHours || 0) * 60 + (durationMinutes || 0))
                : undefined);

            return {
              time: String(s?.time || '').trim(),
              title: String(s?.title || '').trim(),
              details: String(s?.details || '').trim(),
              location: String(s?.location || '').trim(),
              ...(Number.isFinite(computedDurationMin) ? { durationMin: computedDurationMin } : {}),
              ...(Number.isFinite(day) ? { day } : {}),
              ...(Number.isFinite(durationHours) ? { durationHours } : {}),
              ...(Number.isFinite(durationMinutes) ? { durationMinutes } : {}),
              ...(stepTransport ? { transport: stepTransport } : {}),
              ...(stepGuideLanguages.length ? { guideLanguages: stepGuideLanguages } : {}),
              mapsUrl: String(s?.mapsUrl || '').trim(),
            };
          })
          .filter(
            (s) =>
              s.title ||
              s.details ||
              s.time ||
              s.location ||
              s.mapsUrl ||
              s.transport ||
              (Array.isArray(s.guideLanguages) && s.guideLanguages.length > 0) ||
              s.day ||
              s.durationHours ||
              s.durationMinutes
          )
      : [];

    const mapsUrl = String(form.mapsUrl || '').trim();
    const meetingPoint = String(form.meetingPoint || '').trim();
    const dropoffPoint = String(form.dropoffPoint || '').trim();

    const ageMin = form.ageMin === '' ? undefined : Math.max(0, toNumber(form.ageMin, 0));
    const minPeople = form.minPeople === '' ? undefined : Math.max(1, toNumber(form.minPeople, 1));
    const maxPeople = form.maxPeople === '' ? undefined : Math.max(1, toNumber(form.maxPeople, 1));

    const startTimes = parseComma(form.startTimes).map((s) => s.replace(/\s+/g, ''));
    const availableDays = parseComma(form.availableDays);

    return {
      title: String(form.title || '').trim(),
      description: String(form.description || '').trim(),
      city: CITIES.includes(form.city) ? form.city : 'Puno',
      country: String(form.country || '').trim(),
      category: String(form.category || '').trim(),

      price,
      currency,
      ...(Number.isFinite(exclusivePrice) ? { exclusivePrice } : {}),
      durationHours: duration,
      ...(Number.isFinite(dailyCapacity) ? { dailyCapacity } : {}),
      languages: parseLanguages(form.languages),

      ...(transport ? { transport } : {}),
      ...(guideLanguagesList.length ? { guideLanguages: guideLanguagesList } : {}),

      highlights: parseLines(form.highlights),
      includes: parseLines(form.includes),
      excludes: parseLines(form.excludes),
      whatToBring: parseLines(form.whatToBring),
      recommendations: parseLines(form.recommendations),

      media: safeMedia,
      active: !!form.active,

      ...(hasCoords ? { location: { lat: safeLat, lng: safeLng } } : {}),

      // New extra fields (backend must support or ignore)
      ...(mapsUrl ? { mapsUrl } : {}),
      ...(meetingPoint ? { meetingPoint } : {}),
      ...(dropoffPoint ? { dropoffPoint } : {}),
      ...(DIFFICULTY.includes(form.difficulty) ? { difficulty: form.difficulty } : {}),
      ...(Number.isFinite(ageMin) ? { ageMin } : {}),
      ...(Number.isFinite(minPeople) ? { minPeople } : {}),
      ...(Number.isFinite(maxPeople) ? { maxPeople } : {}),
      ...(startTimes.length ? { startTimes } : {}),
      ...(availableDays.length ? { availableDays } : {}),
      ...(itinerarySafe.length ? { itinerary: itinerarySafe } : {}),
      ...(form.brochurePdf?.url ? { brochurePdf: form.brochurePdf } : {}),

      isPromo,
      ...(isPromo
        ? {
            ...(promoPercent ? { promoPercent } : {}),
            ...(promoPrice ? { promoPrice } : {}),
            ...(promoStartAt ? { promoStartAt } : {}),
            ...(promoEndAt ? { promoEndAt } : {}),
          }
        : {}),
    };
  }, [form]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Session expired. Please sign in again.');

      if (!bodyPayload.title) throw new Error('Title is required.');
      if (!bodyPayload.description) throw new Error('Description is required.');

      // Validate URLs if present
      if (form.mapsUrl && !isValidHttpUrl(form.mapsUrl)) throw new Error('Maps URL is invalid.');
      if (Array.isArray(form.itinerary)) {
        for (const s of form.itinerary) {
          if (s?.mapsUrl && !isValidHttpUrl(s.mapsUrl)) throw new Error('One itinerary Maps URL is invalid.');
        }
      }

      const isEdit = Boolean(pkg?._id || pkg?.id);
      const id = pkg?._id || pkg?.id;
      const url = isEdit ? `${API_BASE}/api/packages/${id}` : `${API_BASE}/api/packages`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error('Session expired. Please sign in again.');
        if (res.status === 409) throw new Error('Title already exists. Choose another to generate a unique slug.');
        if (Array.isArray(data?.errors) && data.errors.length)
          throw new Error(data.errors[0].msg || 'Invalid payload.');
        throw new Error(data?.message || 'Could not save the package.');
      }

      onSaved?.(data);
    } catch (err) {
      setError(err.message || 'Unexpected error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleteErr('');
    try {
      const id = pkg?._id || pkg?.id;
      if (!id) return;
      if (!confirm('Delete this package? This cannot be undone.')) return;

      const token = localStorage.getItem('token');
      if (!token) throw new Error('Session expired. Please sign in again.');

      setDeleting(true);
      const res = await fetch(`${API_BASE}/api/packages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error('Session expired. Please sign in again.');
        throw new Error(data?.message || 'Could not delete the package.');
      }
      onSaved?.({ _deleted: true, id });
    } catch (err) {
      setDeleteErr(err.message || 'Delete error');
    } finally {
      setDeleting(false);
    }
  }

  // ---- media ops
  const updateMedia = useCallback((updater) => {
    setForm((prev) => {
      const cur = Array.isArray(prev.media) ? prev.media : [];
      const next = dedupeByUrlType(updater(cur));
      return { ...prev, media: next };
    });
  }, []);

  const removeMediaAt = (i) => updateMedia((list) => list.filter((_, idx) => idx !== i));
  const moveMedia = (i, dir) =>
    updateMedia((list) => {
      const next = [...list];
      const j = i + dir;
      if (j < 0 || j >= next.length) return next;
      const [it] = next.splice(i, 1);
      next.splice(j, 0, it);
      return next;
    });
  const setCover = (i) =>
    updateMedia((list) => {
      if (i <= 0 || i >= list.length) return list;
      const next = [...list];
      const [it] = next.splice(i, 1);
      next.unshift(it);
      return next;
    });
  const setCaption = (i, text) =>
    updateMedia((list) => {
      const next = [...list];
      next[i] = { ...next[i], caption: text };
      return next;
    });

  // Preview cover
  const heroImg = mediaVariantUrl(form.media?.[0], 'medium') || 'https://picsum.photos/800/450';

  // Quick helper: if user has coords but no mapsUrl, build one
  const suggestedMapsUrl = useMemo(() => makeMapsQueryUrlFromCoords(form.lat, form.lng), [form.lat, form.lng]);

  async function uploadBrochurePdf(file) {
    setBrochureUploading(true);
    setBrochureErr('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Session expired. Please sign in again.');

      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch(`${API_BASE}/api/brochures/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Could not upload brochure.');
      }

      const fileInfo = data?.file || {};
      setForm((prev) => ({
        ...prev,
        brochurePdf: {
          url: fileInfo.url,
          relativePath: fileInfo.relativePath,
          filename: fileInfo.filename || file?.name,
          size: fileInfo.size || file?.size,
          uploadedAt: new Date().toISOString(),
        },
      }));
    } catch (err) {
      setBrochureErr(err.message || 'Upload error.');
    } finally {
      setBrochureUploading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT: form */}
      <form onSubmit={submit} className="lg:col-span-2 space-y-6">
        {/* Information */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Information</h3>
            <p className="text-sm text-slate-500 mb-4">Title, region and category.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Title</label>
                <input className="input" value={form.title} onChange={(e) => setField('title', e.target.value)} required disabled={saving} />
              </div>

              <div>
                <label className="label">City</label>
                <select className="input" value={form.city} onChange={(e) => setField('city', e.target.value)} disabled={saving}>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Category</label>
                <input className="input" value={form.category} onChange={(e) => setField('category', e.target.value)} disabled={saving} />
              </div>

              <div>
                <label className="label">Country</label>
                <input className="input" value={form.country} onChange={(e) => setField('country', e.target.value)} placeholder="Perú" disabled={saving} />
              </div>

              <div className="md:col-span-2 flex items-center gap-2 pt-2">
                <input id="active" type="checkbox" checked={form.active} onChange={(e) => setField('active', e.target.checked)} disabled={saving} />
                <label htmlFor="active" className="label m-0">
                  Active
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Description & content */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Description & content</h3>
            <p className="text-sm text-slate-500 mb-4">Sell the experience with text, language tags and highlights.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Description</label>
                <textarea className="input" rows={6} value={form.description} onChange={(e) => setField('description', e.target.value)} disabled={saving} />
              </div>

              <div>
                <label className="label">Languages (comma-separated)</label>
                <input className="input" placeholder="es,en,fr,pt,ru" value={form.languages} onChange={(e) => setField('languages', e.target.value)} disabled={saving} />
              </div>
              <div />

              <div>
                <label className="label">Transport type</label>
                <select className="input" value={form.transport || ''} onChange={(e) => setField('transport', e.target.value)} disabled={saving}>
                  <option value="">Select transport</option>
                  {TRANSPORT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="label">Guide languages (comma-separated)</label>
                <input className="input" placeholder="es,en,pt,fr" value={form.guideLanguages} onChange={(e) => setField('guideLanguages', e.target.value)} disabled={saving} />
              </div>

              <div>
                <label className="label">Highlights (one per line)</label>
                <textarea className="input" rows={5} value={form.highlights} onChange={(e) => setField('highlights', e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className="label">Includes</label>
                <textarea className="input" rows={5} value={form.includes} onChange={(e) => setField('includes', e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className="label">Not included</label>
                <textarea className="input" rows={5} value={form.excludes} onChange={(e) => setField('excludes', e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className="label">What to bring</label>
                <textarea className="input" rows={5} value={form.whatToBring} onChange={(e) => setField('whatToBring', e.target.value)} disabled={saving} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Recommendations</label>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Tip: best season, clothing, altitude notes, cash, etc..."
                  value={form.recommendations}
                  onChange={(e) => setField('recommendations', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="mt-4 rounded-lg border p-3 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">PDF comercial (se envía al reservar)</div>
                  <div className="text-xs text-slate-500">Sube el brochure oficial en PDF para enviar tras la reserva.</div>
                </div>
                {form.brochurePdf?.url ? (
                  <a
                    href={form.brochurePdf.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Ver PDF
                  </a>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={saving || brochureUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadBrochurePdf(file);
                    e.target.value = '';
                  }}
                />
                {form.brochurePdf?.filename ? (
                  <span className="text-xs text-slate-600">
                    {form.brochurePdf.filename} {form.brochurePdf.size ? `· ${(form.brochurePdf.size / (1024 * 1024)).toFixed(1)} MB` : ''}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Sin PDF cargado.</span>
                )}
                {form.brochurePdf?.url ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setForm((prev) => ({ ...prev, brochurePdf: null }))}
                    disabled={saving || brochureUploading}
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
              {brochureErr ? <div className="mt-2 text-xs text-red-600">{brochureErr}</div> : null}
            </div>
          </div>
        </div>

        {/* Price & duration */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Price & duration</h3>
            <p className="text-sm text-slate-500 mb-4">Currency, base price, exclusive (private) price, and total duration split into days and hours.</p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="label">Price</label>
                <input className="input" type="number" min={0} step="0.01" value={form.price} onChange={(e) => setField('price', e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className="label">Exclusive tour price</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Leave empty to use base price"
                  value={form.exclusivePrice}
                  onChange={(e) => setField('exclusivePrice', e.target.value)}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="label">Currency</label>
                <select className="input" value={form.currency} onChange={(e) => setField('currency', e.target.value)} disabled={saving}>
                  {CURRENCIES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Days</label>
                <input className="input" type="number" min={0} step="1" value={form.durationDays} onChange={(e) => setField('durationDays', e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className="label">Hours (0–23)</label>
                <input className="input" type="number" min={0} max={23} value={form.durationHours} onChange={(e) => setField('durationHours', e.target.value)} disabled={saving} />
              </div>
            </div>
          </div>
        </div>

        {/* Promotion / Discount */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Promotion / Discount</h3>
            <p className="text-sm text-slate-500 mb-4">Percent or fixed price, with optional dates.</p>

            <div className="flex items-center gap-2 mb-4">
              <input id="isPromo" type="checkbox" checked={form.isPromo} onChange={(e) => setField('isPromo', e.target.checked)} disabled={saving} />
              <label htmlFor="isPromo" className="label m-0">
                Enable promotion
              </label>
            </div>

            {form.isPromo && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="label">% Off (0–100)</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={100}
                    step="1"
                    placeholder="15"
                    value={form.promoPercent}
                    onChange={(e) => setField('promoPercent', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="label">Promo price (optional)</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="99.90"
                    value={form.promoPrice}
                    onChange={(e) => setField('promoPrice', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="label">Start (optional)</label>
                  <input className="input" type="date" value={form.promoStartAt} onChange={(e) => setField('promoStartAt', e.target.value)} disabled={saving} />
                </div>
                <div>
                  <label className="label">End (optional)</label>
                  <input className="input" type="date" value={form.promoEndAt} onChange={(e) => setField('promoEndAt', e.target.value)} disabled={saving} />
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 mt-3">
              If you set a <b>promo price</b>, it takes precedence over the percent.
            </p>
          </div>
        </div>

        {/* Location */}
        <div className="card">
          <div className="card-body space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Location</h3>
              <p className="text-sm text-slate-500">Coordinates, meeting points and Maps link.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Latitude (−90 to 90)</label>
                <input className="input" type="number" step="any" min={-90} max={90} placeholder="-15.840" value={form.lat} onChange={(e) => setField('lat', e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className="label">Longitude (−180 to 180)</label>
                <input className="input" type="number" step="any" min={-180} max={180} placeholder="-70.019" value={form.lng} onChange={(e) => setField('lng', e.target.value)} disabled={saving} />
              </div>

              <div className="md:col-span-2">
                <label className="label">Maps link</label>
                <input className="input" placeholder="https://maps.app.goo.gl/..." value={form.mapsUrl} onChange={(e) => setField('mapsUrl', e.target.value)} disabled={saving} />
                {form.mapsUrl && !isValidHttpUrl(form.mapsUrl) && <p className="text-xs text-red-600 mt-1">Invalid URL</p>}

                {!form.mapsUrl && suggestedMapsUrl && (
                  <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
                    <span>Suggested from coords:</span>
                    <a className="underline" href={suggestedMapsUrl} target="_blank" rel="noreferrer">
                      Open
                    </a>
                    <button type="button" className="btn btn-ghost !py-1 !px-2" onClick={() => setField('mapsUrl', suggestedMapsUrl)} disabled={saving}>
                      Use
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="label">Meeting / pickup point</label>
                <input
                  className="input"
                  placeholder="Hotel pickup / Plaza de Armas / Port..."
                  value={form.meetingPoint}
                  onChange={(e) => setField('meetingPoint', e.target.value)}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="label">Drop-off point</label>
                <input
                  className="input"
                  placeholder="Same as pickup / City center..."
                  value={form.dropoffPoint}
                  onChange={(e) => setField('dropoffPoint', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Schedule & constraints */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Schedule & constraints</h3>
            <p className="text-sm text-slate-500 mb-4">Start times, available days, group size and difficulty.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Start times (comma-separated)</label>
                <input className="input" placeholder="08:00, 14:00" value={form.startTimes} onChange={(e) => setField('startTimes', e.target.value)} disabled={saving} />
                <p className="text-xs text-slate-500 mt-1">
                  Example: <b>08:00, 14:00</b>
                </p>
              </div>
              <div>
                <label className="label">Available days (comma-separated)</label>
                <input className="input" placeholder="Lun,Mar,Mié,Jue,Vie,Sáb,Dom" value={form.availableDays} onChange={(e) => setField('availableDays', e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className="label">Difficulty</label>
                <select className="input" value={form.difficulty} onChange={(e) => setField('difficulty', e.target.value)} disabled={saving}>
                  {DIFFICULTY.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="label">Age min</label>
                  <input className="input" type="number" min={0} step="1" placeholder="0" value={form.ageMin} onChange={(e) => setField('ageMin', e.target.value)} disabled={saving} />
                </div>
                <div>
                  <label className="label">Min people</label>
                  <input className="input" type="number" min={1} step="1" placeholder="1" value={form.minPeople} onChange={(e) => setField('minPeople', e.target.value)} disabled={saving} />
                </div>
                <div>
                  <label className="label">Max people</label>
                  <input className="input" type="number" min={1} step="1" placeholder="15" value={form.maxPeople} onChange={(e) => setField('maxPeople', e.target.value)} disabled={saving} />
                </div>
                <div>
                  <label className="label">Daily capacity</label>
                  <input className="input" type="number" min={0} step="1" placeholder="0" value={form.dailyCapacity} onChange={(e) => setField('dailyCapacity', e.target.value)} disabled={saving} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Itinerary */}
        <div className="card">
          <div className="card-body">
            <ItineraryEditor value={form.itinerary} onChange={(next) => setField('itinerary', next)} disabled={saving} />
          </div>
        </div>

        {/* Media */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Images & videos</h3>
            <p className="text-sm text-slate-500 mb-4">The first image becomes the cover.</p>

            <Uploader
              disabled={saving}
              onUploaded={(incoming) => {
                setForm((prev) => {
                  const prevMedia = Array.isArray(prev.media) ? prev.media : [];
                  const list = typeof incoming === 'function' ? incoming(prevMedia) : incoming;
                  const next = Array.isArray(list) ? list : prevMedia;
                  return { ...prev, media: dedupeByUrlType(next) };
                });
              }}
            />

            {Boolean(form.media?.length) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {form.media.map((m, i) => {
                  const src = mediaVariantUrl(m, 'thumb') || mediaUrl(m.url);
                  return (
                    <div key={`${src}-${i}`} className="relative rounded-lg overflow-hidden border group">
                      {m.type === 'video' ? (
                        <video src={src} className="w-full h-28 object-cover" controls />
                      ) : (
                        <img src={src} className="w-full h-28 object-cover" alt="" />
                      )}

                      <div className="absolute top-1 right-1 flex gap-1">
                        <button type="button" className="btn btn-ghost !px-2 !py-1" onClick={() => removeMediaAt(i)} title="Remove">
                          ✕
                        </button>
                      </div>

                      <div className="p-2 border-t bg-white">
                        <input className="input text-xs" placeholder="Caption (optional)" value={m.caption || ''} onChange={(e) => setCaption(i, e.target.value)} disabled={saving} />
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <div className="flex gap-1">
                            <button type="button" className="btn btn-ghost !px-2" onClick={() => moveMedia(i, -1)} disabled={i === 0}>
                              ←
                            </button>
                            <button type="button" className="btn btn-ghost !px-2" onClick={() => moveMedia(i, +1)} disabled={i === form.media.length - 1}>
                              →
                            </button>
                          </div>
                          {i !== 0 && (
                            <button type="button" className="btn btn-ghost !px-2" onClick={() => setCover(i)} title="Set as cover">
                              Make cover
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Error + submit */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn btn-primary flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Save package'}
          </button>

          {Boolean(pkg?._id || pkg?.id) && (
            <button
              type="button"
              className="btn bg-red-600 text-white hover:bg-red-700 sm:w-48"
              onClick={handleDelete}
              disabled={deleting || saving}
              title="Delete package"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>

        {deleteErr && <p className="text-sm text-red-600">{deleteErr}</p>}
      </form>

      {/* RIGHT: sticky preview */}
      <aside className="lg:col-span-1">
        <div className="sticky top-24 space-y-4">
          <div className="card overflow-hidden">
            <div className="relative">
              <img src={heroImg} alt="" className="w-full h-40 object-cover" />
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                {form.city} • {form.currency} {form.price || 0}
              </div>
            </div>

            <div className="p-4">
              <div className="text-base font-semibold">{form.title || 'New package'}</div>
              <p className="text-sm text-slate-600 line-clamp-3 mt-1">
                {form.description || 'Write an engaging description for your experience.'}
              </p>

              {parseLines(form.highlights).length > 0 && (
                <ul className="mt-3 text-sm text-slate-700 list-disc pl-5 space-y-1 max-h-28 overflow-auto">
                  {parseLines(form.highlights).slice(0, 5).map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              )}

              <div className="mt-3 text-xs text-slate-500 space-y-1">
                <div>
                  Duration: {form.durationHours} h • Languages: {parseLanguages(form.languages).join(', ') || '—'}
                </div>
                <div>
                  Difficulty: {form.difficulty || '—'} • Group: {form.minPeople || '—'}–{form.maxPeople || '—'} • Age: {form.ageMin ? `${form.ageMin}+` : '—'}
                </div>
                {form.mapsUrl ? (
                  <div className="flex items-center gap-2">
                    <span>Maps:</span>
                    <a className="underline" href={form.mapsUrl} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </div>
                ) : (form.lat || form.lng) ? (
                  <div>Coords: {form.lat || '—'}, {form.lng || '—'}</div>
                ) : null}
                {form.isPromo && (
                  <div className="text-green-700">
                    Promo enabled {form.promoPercent ? `• ${form.promoPercent}%` : ''} {form.promoPrice ? `• ${form.promoPrice}` : ''}
                  </div>
                )}
              </div>

              {Array.isArray(form.itinerary) && form.itinerary.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-700 mb-2">Itinerary (preview)</div>
                  <ol className="text-xs text-slate-600 space-y-1">
                    {form.itinerary.slice(0, 4).map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-slate-500 w-12">{s.time || '—'}</span>
                        <span className="font-medium text-slate-700">{s.title || 'Step'}</span>
                      </li>
                    ))}
                    {form.itinerary.length > 4 && (
                      <li className="text-slate-500">+ {form.itinerary.length - 4} more…</li>
                    )}
                  </ol>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Tip</div>
            <p className="text-xs text-slate-600 mt-1">
              Add a detailed itinerary + “what to bring” and you’ll convert more bookings (people trust the details).
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
