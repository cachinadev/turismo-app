// frontend/app/admin/packages/_form.jsx
'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import Uploader from './_uploader';
import { mediaUrl } from '@/app/lib/media';
import { API_BASE } from '@/app/lib/config';

const EMPTY = {
  title: '',
  description: '',
  city: 'Puno',
  country: 'Perú',
  category: 'Tour',
  price: 0,
  currency: 'PEN',
  durationHours: 8,
  languages: 'es,en',
  highlights: '',
  includes: '',
  excludes: '',
  active: true,
  media: [],
  lat: '',
  lng: '',
  isPromo: false,
  promoPercent: '',
  promoPrice: '',
  promoStartAt: '',
  promoEndAt: '',
};

const CITIES = ['Puno', 'Cusco', 'Lima', 'Arequipa', 'Otros'];
const CURRENCIES = ['PEN', 'USD'];
const DURATION_MIN = 1;
const DURATION_MAX = 240;

// ---- helpers
const toNumber = (v, def = 0) => (Number.isFinite(Number(v)) ? Number(v) : def);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const parseLines = (v, sepRe = /\r?\n/) =>
  Array.from(new Set(String(v || '').split(sepRe).map(s => s.trim()).filter(Boolean)));
const parseLanguages = (v) =>
  Array.from(new Set(String(v || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)));
const dedupeByUrlType = (list = []) => {
  const seen = new Set(); const out = [];
  for (const m of list) {
    const key = `${m.type || 'image'}|${(m.url || '').trim()}`;
    if (!m.url || seen.has(key)) continue;
    seen.add(key); out.push(m);
  }
  return out;
};

export default function PackageForm({ pkg, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [deleteErr, setDeleteErr] = useState('');
  const [showBrochure, setShowBrochure] = useState(false);
  const [brochureText, setBrochureText] = useState('');

  // Load edit values (or reset for new)
  useEffect(() => {
    if (!pkg) { setForm(EMPTY); return; }
    setForm({
      title: pkg.title ?? '',
      description: pkg.description ?? '',
      city: CITIES.includes(pkg.city) ? pkg.city : 'Puno',
      country: pkg.country ?? 'Perú',
      category: pkg.category ?? 'Tour',
      price: Number(pkg.price ?? 0),
      currency: CURRENCIES.includes(pkg.currency) ? pkg.currency : 'PEN',
      durationHours: Number(pkg.durationHours ?? 8),
      languages: Array.isArray(pkg.languages) ? pkg.languages.join(',') : 'es,en',
      highlights: Array.isArray(pkg.highlights) ? pkg.highlights.join('\n') : '',
      includes: Array.isArray(pkg.includes) ? pkg.includes.join('\n') : '',
      excludes: Array.isArray(pkg.excludes) ? pkg.excludes.join('\n') : '',
      active: Boolean(pkg.active ?? true),
      media: Array.isArray(pkg.media) ? pkg.media : [],
      lat: (pkg?.location?.lat ?? pkg?.lat ?? '') + '',
      lng: (pkg?.location?.lng ?? pkg?.lng ?? '') + '',
      isPromo: Boolean(pkg?.isPromo ?? false),
      promoPercent: (pkg?.promoPercent ?? '') + '',
      promoPrice: (pkg?.promoPrice ?? '') + '',
      promoStartAt: (pkg?.promoStartAt ?? '').slice(0, 10),
      promoEndAt: (pkg?.promoEndAt ?? '').slice(0, 10),
    });
  }, [pkg]);

  const setField = useCallback((k, v) => setForm(prev => ({ ...prev, [k]: v })), []);

  // Build safe payload the backend expects
  const bodyPayload = useMemo(() => {
    const price    = Math.max(0, toNumber(form.price, 0));
    const duration = clamp(toNumber(form.durationHours, DURATION_MIN), DURATION_MIN, DURATION_MAX);
    const currency = CURRENCIES.includes(form.currency) ? form.currency : 'PEN';

    // sanitize media (url + type only; optional caption)
    const safeMedia = Array.isArray(form.media)
      ? dedupeByUrlType(
          form.media
            .filter(m => m && m.url && (m.type === 'image' || m.type === 'video'))
            .map(({ url, type, caption }) => ({ url, type, ...(caption ? { caption } : {}) }))
        )
      : [];

    const latNum = Number(form.lat);
    const lngNum = Number(form.lng);
    const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);
    const safeLat = hasCoords ? clamp(latNum, -90, 90) : undefined;
    const safeLng = hasCoords ? clamp(lngNum, -180, 180) : undefined;

    const isPromo = !!form.isPromo;
    const promoPercent = clamp(toNumber(form.promoPercent, 0), 0, 100);
    const promoPrice   = Math.max(0, toNumber(form.promoPrice, 0));
    const promoStartAt = form.promoStartAt ? new Date(form.promoStartAt).toISOString() : undefined;
    const promoEndAt   = form.promoEndAt ? new Date(form.promoEndAt).toISOString() : undefined;

    return {
      title: String(form.title || '').trim(),
      description: String(form.description || '').trim(),
      city: CITIES.includes(form.city) ? form.city : 'Puno',
      country: String(form.country || '').trim(),
      category: String(form.category || '').trim(),
      price,
      currency,
      durationHours: duration,
      languages: parseLanguages(form.languages),
      highlights: parseLines(form.highlights),
      includes: parseLines(form.includes),
      excludes: parseLines(form.excludes),
      media: safeMedia,
      active: !!form.active,
      ...(hasCoords ? { location: { lat: safeLat, lng: safeLng } } : {}),
      isPromo,
      ...(isPromo ? {
        ...(promoPercent ? { promoPercent } : {}),
        ...(promoPrice ? { promoPrice } : {}),
        ...(promoStartAt ? { promoStartAt } : {}),
        ...(promoEndAt ? { promoEndAt } : {}),
      } : {}),
    };
  }, [form]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Session expired. Please sign in again.');

      if (!bodyPayload.title)       throw new Error('Title is required.');
      if (!bodyPayload.description) throw new Error('Description is required.');

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
        if (Array.isArray(data?.errors) && data.errors.length) throw new Error(data.errors[0].msg || 'Invalid payload.');
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
    setForm(prev => {
      const cur = Array.isArray(prev.media) ? prev.media : [];
      const next = dedupeByUrlType(updater(cur));
      return { ...prev, media: next };
    });
  }, []);

  const removeMediaAt = (i) => updateMedia(list => list.filter((_, idx) => idx !== i));
  const moveMedia = (i, dir) => updateMedia(list => {
    const next = [...list];
    const j = i + dir;
    if (j < 0 || j >= next.length) return next;
    const [it] = next.splice(i, 1);
    next.splice(j, 0, it);
    return next;
  });
  const setCover = (i) => updateMedia(list => {
    if (i <= 0 || i >= list.length) return list;
    const next = [...list];
    const [it] = next.splice(i, 1);
    next.unshift(it);
    return next;
  });
  const setCaption = (i, text) => updateMedia(list => {
    const next = [...list];
    next[i] = { ...next[i], caption: text };
    return next;
  });

  // Preview cover
  const heroImg = mediaUrl(form.media?.[0]?.url) || 'https://picsum.photos/800/450';

  // ---- brochure importer (paste → parse → fill)
  function parseBrochure(textRaw) {
    const text = String(textRaw || '').replace(/\r/g, '').trim();

    // Extract major sections by headers
    const getSection = (name) => {
      const re = new RegExp(`${name}\\s*\\n([\\s\\S]*?)(?=\\n[A-Z ]{3,}:?|\\nIT\\s+INCLUDES|\\nNOT\\s+INCLUDED|\\nWHAT\\s+TO\\s+BRING\\??|$)`, 'i');
      const m = text.match(re);
      return m ? m[1].trim() : '';
    };

    const includesBlock = text.split(/\nIT\s+INCLUDES\s*\n/i)[1]?.split(/\nNOT\s+INCLUDED/i)[0] ?? '';
    const notInclBlock  = text.split(/\nNOT\s+INCLUDED\s*\n/i)[1]?.split(/\nWHAT\s+TO\s+BRING/i)[0] ?? '';
    const bringBlock    = text.split(/\nWHAT\s+TO\s+BRING\??\s*\n/i)[1]?.split(/\n[A-Z ]{3,}:|$/)[0] ?? '';

    const times = [];
    const timeRe = /\b(8[:\.]?(?:45)?\s*am|12[:\.]?00\s*p\.?m\.?|3[:\.]?45\s*p\.?m\.?)\b/ig;
    let tm;
    while ((tm = timeRe.exec(text))) times.push(tm[0].replace(/\s+/g,' '));

    const highlights = times.length
      ? [`Visit times: ${Array.from(new Set(times)).join(' · ')}`]
      : [];

    if (bringBlock) {
      const br = parseLines(bringBlock);
      if (br.length) highlights.push(...br.map(b => `Bring: ${b}`));
    }

    // Description: keep top paragraphs before the first all-caps section
    const mainDesc = text.split(/\n(?:ITINERARY|DETAILED ITINERARY|IT\s+INCLUDES|NOT\s+INCLUDED|WHAT\s+TO\s+BRING)/i)[0]?.trim() || text;

    return {
      description: mainDesc,
      highlights,
      includes: parseLines(includesBlock),
      excludes: parseLines(notInclBlock),
    };
  }

  function applyBrochure() {
    const parsed = parseBrochure(brochureText);
    setForm(prev => ({
      ...prev,
      description: parsed.description || prev.description,
      highlights: [...new Set([...(parseLines(prev.highlights)), ...(parsed.highlights || [])])].join('\n'),
      includes:   [...new Set([...(parseLines(prev.includes)),   ...(parsed.includes   || [])])].join('\n'),
      excludes:   [...new Set([...(parseLines(prev.excludes)),   ...(parsed.excludes   || [])])].join('\n'),
    }));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT: form */}
      <form onSubmit={submit} className="lg:col-span-2 space-y-6">
        {/* Basic info */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Basic info</h3>
            <p className="text-sm text-slate-500 mb-4">Title, location and primary details.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Title</label>
                <input className="input" value={form.title} onChange={e => setField('title', e.target.value)} required disabled={saving} />
              </div>
              <div>
                <label className="label">City</label>
                <select className="input" value={form.city} onChange={e => setField('city', e.target.value)} disabled={saving}>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Category</label>
                <input className="input" value={form.category} onChange={e => setField('category', e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className="label">Country</label>
                <input className="input" value={form.country} onChange={e => setField('country', e.target.value)} placeholder="Perú" disabled={saving} />
              </div>

              <div className="md:col-span-2 flex items-center gap-2 pt-2">
                <input id="active" type="checkbox" checked={form.active} onChange={e => setField('active', e.target.checked)} disabled={saving} />
                <label htmlFor="active" className="label m-0">Active</label>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Location</h3>
            <p className="text-sm text-slate-500 mb-4">Coordinates used on the map.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Latitude (−90 to 90)</label>
                <input className="input" type="number" step="any" min={-90} max={90} placeholder="-15.840"
                       value={form.lat} onChange={e => setField('lat', e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className="label">Longitude (−180 to 180)</label>
                <input className="input" type="number" step="any" min={-180} max={180} placeholder="-70.019"
                       value={form.lng} onChange={e => setField('lng', e.target.value)} disabled={saving} />
              </div>
            </div>
          </div>
        </div>

        {/* Price & duration */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Price & duration</h3>
            <p className="text-sm text-slate-500 mb-4">Currency, base price and hours.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Price</label>
                <input className="input" type="number" min={0} step="0.01"
                       value={form.price} onChange={e => setField('price', e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className="label">Currency</label>
                <select className="input" value={form.currency} onChange={e => setField('currency', e.target.value)} disabled={saving}>
                  {CURRENCIES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Duration (hours)</label>
                <input className="input" type="number" min={DURATION_MIN} max={DURATION_MAX}
                       value={form.durationHours} onChange={e => setField('durationHours', e.target.value)} disabled={saving} />
              </div>
            </div>
          </div>
        </div>

        {/* Promotion */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Promotion / Discount</h3>
            <p className="text-sm text-slate-500 mb-4">Percent or fixed price, with optional dates.</p>

            <div className="flex items-center gap-2 mb-4">
              <input id="isPromo" type="checkbox" checked={form.isPromo} onChange={e => setField('isPromo', e.target.checked)} disabled={saving} />
              <label htmlFor="isPromo" className="label m-0">Enable promotion</label>
            </div>

            {form.isPromo && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="label">% Off (0–100)</label>
                  <input className="input" type="number" min={0} max={100} step="1" placeholder="15"
                         value={form.promoPercent} onChange={e => setField('promoPercent', e.target.value)} disabled={saving} />
                </div>
                <div>
                  <label className="label">Promo price (optional)</label>
                  <input className="input" type="number" min={0} step="0.01" placeholder="99.90"
                         value={form.promoPrice} onChange={e => setField('promoPrice', e.target.value)} disabled={saving} />
                </div>
                <div>
                  <label className="label">Start (optional)</label>
                  <input className="input" type="date" value={form.promoStartAt} onChange={e => setField('promoStartAt', e.target.value)} disabled={saving} />
                </div>
                <div>
                  <label className="label">End (optional)</label>
                  <input className="input" type="date" value={form.promoEndAt} onChange={e => setField('promoEndAt', e.target.value)} disabled={saving} />
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-3">
              If you set a <b>promo price</b>, it takes precedence over the percent. Backend computes the effective price.
            </p>
          </div>
        </div>

        {/* Description & content */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Description & content</h3>
            <p className="text-sm text-slate-500 mb-4">Full description, languages and lists.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Description</label>
                <textarea className="input" rows={6} value={form.description} onChange={e => setField('description', e.target.value)} disabled={saving} />
              </div>

              <div>
                <label className="label">Languages (comma-separated)</label>
                <input className="input" placeholder="es,en,fr,pt,ru" value={form.languages} onChange={e => setField('languages', e.target.value)} disabled={saving} />
              </div>
              <div />

              <div>
                <label className="label">Highlights (one per line)</label>
                <textarea className="input" rows={5} value={form.highlights} onChange={e => setField('highlights', e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className="label">Includes</label>
                <textarea className="input" rows={5} value={form.includes} onChange={e => setField('includes', e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className="label">Not included</label>
                <textarea className="input" rows={5} value={form.excludes} onChange={e => setField('excludes', e.target.value)} disabled={saving} />
              </div>
            </div>

            {/* Brochure importer */}
            <div className="mt-4 rounded-lg border p-3 bg-slate-50">
              <button type="button" className="btn btn-ghost" onClick={() => setShowBrochure((s) => !s)}>
                {showBrochure ? 'Hide brochure importer' : 'Import from brochure'}
              </button>
              {showBrochure && (
                <div className="mt-3 space-y-2">
                  <textarea
                    className="input w-full min-h-[160px]"
                    placeholder="Paste brochure text here…"
                    value={brochureText}
                    onChange={(e) => setBrochureText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button type="button" className="btn" onClick={applyBrochure}>Parse & fill</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setBrochureText('')}>Clear</button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Tip: paste the raw text (like your Uros half-day brochure). We’ll pull visit times into Highlights,
                    split Includes/Not included/What to bring, and keep the top paragraphs as Description.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Media */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold">Images & videos</h3>
            <p className="text-sm text-slate-500 mb-4">The first image is used as the cover.</p>

            <Uploader
              disabled={saving}
              // Uploader already batches + de-dupes; we just merge
              onUploaded={(incoming) => {
                setForm(prev => {
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
                  const src = mediaUrl(m.url);
                  return (
                    <div key={`${src}-${i}`} className="relative rounded-lg overflow-hidden border group">
                      {m.type === 'video' ? (
                        <video src={src} className="w-full h-28 object-cover" controls />
                      ) : (
                        <img src={src} className="w-full h-28 object-cover" alt="" />
                      )}

                      <div className="absolute top-1 right-1 flex gap-1">
                        <button type="button" className="btn btn-ghost !px-2 !py-1" onClick={() => removeMediaAt(i)} title="Remove">✕</button>
                      </div>

                      <div className="p-2 border-t bg-white">
                        <input
                          className="input text-xs"
                          placeholder="Caption (optional)"
                          value={m.caption || ''}
                          onChange={(e) => setCaption(i, e.target.value)}
                          disabled={saving}
                        />
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <div className="flex gap-1">
                            <button type="button" className="btn btn-ghost !px-2" onClick={() => moveMedia(i, -1)} disabled={i === 0}>←</button>
                            <button type="button" className="btn btn-ghost !px-2" onClick={() => moveMedia(i, +1)} disabled={i === form.media.length - 1}>→</button>
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
            <button type="button" className="btn bg-red-600 text-white hover:bg-red-700 sm:w-48"
                    onClick={handleDelete} disabled={deleting || saving} title="Delete package">
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
                  {parseLines(form.highlights).slice(0, 5).map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              )}

              <div className="mt-3 text-xs text-slate-500 space-y-1">
                <div>Duration: {form.durationHours} h • Languages: {parseLanguages(form.languages).join(', ') || '—'}</div>
                {(form.lat || form.lng) && (<div>Location: {form.lat || '—'}, {form.lng || '—'}</div>)}
                {form.isPromo && (
                  <div className="text-green-700">
                    Promo enabled {form.promoPercent ? `• ${form.promoPercent}%` : ''} {form.promoPrice ? `• ${form.promoPrice}` : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Tip</div>
            <p className="text-xs text-slate-600 mt-1">
              Use landscape images (≥1200×600) for the best cover quality.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
