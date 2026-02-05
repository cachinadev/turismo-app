// frontend/app/admin/i18n/AdminI18nProvider.jsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const AdminI18nContext = createContext({
  lang: "es",
  setLang: () => {},
  t: (k, fb) => fb || k,
});

const STORAGE_KEY = "admin_lang";

function getByPath(obj, path) {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = String(path || "").split(".");
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

export default function AdminI18nProvider({ children }) {
  const [lang, setLang] = useState("es");
  const [dict, setDict] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "es" || saved === "en") setLang(saved);
    } catch {}
  }, []);

  useEffect(() => {
    let alive = true;
    import(`./${lang}.json`)
      .then((m) => {
        if (alive) setDict(m.default || m || {});
      })
      .catch(() => {
        if (alive) setDict({});
      });
    return () => {
      alive = false;
    };
  }, [lang]);

  const setLangSafe = useCallback((next) => {
    const v = next === "en" ? "en" : "es";
    setLang(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {}
  }, []);

  const t = useCallback(
    (key, fallback) => {
      const v = getByPath(dict, key);
      if (typeof v === "string" && v.trim()) return v;
      return fallback || key;
    },
    [dict]
  );

  const value = useMemo(() => ({ lang, setLang: setLangSafe, t }), [lang, setLangSafe, t]);

  return <AdminI18nContext.Provider value={value}>{children}</AdminI18nContext.Provider>;
}

export function useAdminI18n() {
  return useContext(AdminI18nContext);
}
