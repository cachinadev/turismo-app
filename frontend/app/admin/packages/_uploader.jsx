// frontend/app/admin/packages/_uploader.jsx
'use client';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { mediaUrl } from '@/app/lib/media';
import { API_BASE } from '@/app/lib/config';

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ACCEPT =
  '.jpg,.jpeg,.png,.webp,.mp4,.mov,.avi,' +
  'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/x-msvideo';

function kindFromType(t) { return String(t || '').startsWith('video') ? 'video' : 'image'; }
function isAccepted(file) {
  const t = (file.type || '').toLowerCase();
  const n = (file.name || '').toLowerCase();
  return (
    t.startsWith('image/') || t.startsWith('video/') ||
    n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.png') || n.endsWith('.webp') ||
    n.endsWith('.mp4') || n.endsWith('.mov') || n.endsWith('.avi')
  );
}

// Helper to dedupe by url+type (keeps first occurrence)
function dedupeByUrlType(list = []) {
  const seen = new Set();
  const out = [];
  for (const m of list) {
    const key = `${m.type || 'image'}|${(m.url || '').trim()}`;
    if (!m.url || seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

export default function Uploader({
  onUploaded,
  disabled = false,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  accept = ACCEPT,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const tempsRef = useRef([]); // [{url,type,__temp,__revoke,__batch}]
  const batchCounter = useRef(1);

  const acceptAttr = useMemo(() => accept, [accept]);

  const clearTemps = useCallback((predicate = null) => {
    tempsRef.current = tempsRef.current.filter((t) => {
      const remove = predicate ? predicate(t) : true;
      if (remove && t.__revoke && t.url) {
        try { URL.revokeObjectURL(t.url); } catch {}
      }
      return !remove;
    });
  }, []);

  const addTemps = useCallback((files, batchId) => {
    const temps = files.map((f) => ({
      url: URL.createObjectURL(f),
      type: kindFromType(f.type),
      __temp: true,
      __revoke: true,
      __batch: batchId,
    }));
    tempsRef.current.push(...temps);
    // Append temps into parent list
    onUploaded?.((prev = []) => dedupeByUrlType([...(prev || []), ...temps]));
  }, [onUploaded]);

  const removeTempsFromParent = useCallback((batchId) => {
    // Remove only temps for a specific batch
    onUploaded?.((prev = []) => (prev || []).filter((x) => !(x.__temp && x.__batch === batchId)));
  }, [onUploaded]);

  const validateFiles = useCallback((files) => {
    if (!files.length) return { ok: false, reason: 'No files selected.' };
    if (files.length > maxFiles) return { ok: false, reason: `Max ${maxFiles} files per upload.` };
    const badSize = files.find((f) => f.size > maxFileSize);
    if (badSize) return { ok: false, reason: `“${badSize.name}” exceeds ${Math.round(maxFileSize / (1024*1024))} MB.` };
    const badType = files.find((f) => !isAccepted(f));
    if (badType) return { ok: false, reason: `Unsupported format: ${badType.name}` };
    return { ok: true };
  }, [maxFiles, maxFileSize]);

  async function uploadFiles(files, batchId) {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token') || '';
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));

      const res = await fetch(`${API_BASE}/api/uploads`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      let data = {};
      try { data = await res.json(); } catch {}

      if (!res.ok) {
        const msg = data?.error || data?.message ||
          (res.status === 401 ? 'Not authorized. Please sign in.' :
           res.status === 413 ? `File too large (max ${Math.round(maxFileSize / (1024*1024))} MB).` :
           res.status === 415 ? 'Unsupported media type.' :
           'Could not upload files.');
        throw new Error(msg);
      }

      // Replace temps for this batch with server results
      const uploaded = (data.files || []).map((it) => ({
        ...it,
        url: mediaUrl(it.url),
        __temp: false,
      }));

      onUploaded?.((prev = []) => {
        // keep everything except temps of this batch
        const keep = (prev || []).filter((x) => !(x.__temp && x.__batch === batchId));
        const next = dedupeByUrlType([...keep, ...uploaded]);
        // cleanup objectURLs for the batch
        clearTemps((t) => t.__batch === batchId);
        return next;
      });
    } catch (err) {
      // Rollback temps for this batch
      removeTempsFromParent(batchId);
      clearTemps((t) => t.__batch === batchId);
      setError(err.message || 'Upload error.');
    } finally {
      setLoading(false);
    }
  }

  const processFileList = useCallback((fileList) => {
    const files = Array.from(fileList || []);
    const { ok, reason } = validateFiles(files);
    if (!ok) { setError(reason || 'Invalid files.'); return; }
    const batchId = batchCounter.current++;
    addTemps(files, batchId);
    uploadFiles(files, batchId);
  }, [validateFiles, addTemps]);

  function handleChange(e) {
    const fileList = e.target.files;
    if (!fileList || !fileList.length) return;
    processFileList(fileList);
    e.target.value = ''; // allow reselection
  }

  // Drag & Drop
  function onDragEnter(e) { e.preventDefault(); e.stopPropagation(); if (!disabled && !loading) setDragOver(true); }
  function onDragOver(e)  { e.preventDefault(); e.stopPropagation(); }
  function onDragLeave(e) { e.preventDefault(); e.stopPropagation(); setDragOver(false); }
  function onDrop(e) {
    e.preventDefault(); e.stopPropagation();
    if (disabled || loading) return;
    setDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length) processFileList(files);
  }

  // Paste from clipboard
  useEffect(() => {
    function onPaste(e) {
      if (disabled || loading) return;
      const items = Array.from(e.clipboardData?.items || []);
      const files = items.filter((i) => i.kind === 'file').map((i) => i.getAsFile()).filter(Boolean);
      if (files.length) processFileList(files);
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [disabled, loading, processFileList]);

  // Cleanup all temps on unmount
  useEffect(() => () => clearTemps(), [clearTemps]);

  const boxClasses =
    `border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition 
     ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} 
     ${dragOver ? 'ring-2 ring-brand-600 bg-brand-50/40' : ''}`;

  return (
    <div className="space-y-2">
      <label className="label" htmlFor="admin-upload-input">Images / Videos</label>

      <div
        className={boxClasses}
        onClick={() => !disabled && !loading && inputRef.current?.click()}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        aria-disabled={disabled || loading}
        aria-label="Upload area: drag & drop, paste, or select files"
      >
        <div className="text-sm text-slate-600">
          Formats: JPG, PNG, WEBP, MP4, MOV, AVI • Max {maxFiles} files • ≤ {Math.round(maxFileSize / (1024*1024))}MB each
          <div className="text-xs text-slate-500 mt-1">
            You can also <b>drag & drop</b> or <b>paste</b> media here.
          </div>
        </div>
        <button
          type="button"
          className="btn"
          onClick={(e) => { e.stopPropagation(); !disabled && !loading && inputRef.current?.click(); }}
          disabled={disabled || loading}
        >
          {loading ? 'Uploading…' : 'Select files'}
        </button>
      </div>

      <input
        id="admin-upload-input"
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept={acceptAttr}
        onChange={handleChange}
        disabled={disabled || loading}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
