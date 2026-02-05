// frontend/app/admin/i18n/AdminNotice.jsx
"use client";

import { useAdminI18n } from "./AdminI18nProvider";

export default function AdminNotice() {
  const { t } = useAdminI18n();

  return (
    <div className="fixed top-3 left-3 z-[60] hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs text-slate-600 shadow-sm">
      <span>{t("notice.text", "Admin uses /admin")}</span>
      <span className="text-slate-300">•</span>
      <a href="/admin" className="underline hover:text-slate-900">
        {t("notice.link", "Go to /admin")}
      </a>
    </div>
  );
}
