// frontend/app/admin/i18n/AdminLangSwitch.jsx
"use client";

import { useAdminI18n } from "./AdminI18nProvider";

export default function AdminLangSwitch() {
  const { lang, setLang, t } = useAdminI18n();

  return (
    <div className="flex items-center gap-2 rounded-xl border bg-white/90 backdrop-blur px-2 py-1 shadow-sm">
      <button
        type="button"
        className={`px-2 py-1 text-xs rounded-lg ${lang === "es" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        onClick={() => setLang("es")}
      >
        {t("lang.es", "Español")}
      </button>
      <button
        type="button"
        className={`px-2 py-1 text-xs rounded-lg ${lang === "en" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        onClick={() => setLang("en")}
      >
        {t("lang.en", "English")}
      </button>
    </div>
  );
}
