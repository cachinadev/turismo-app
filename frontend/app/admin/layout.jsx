// frontend/app/admin/layout.jsx
import AdminI18nProvider from "./i18n/AdminI18nProvider";
import AdminLangSwitch from "./i18n/AdminLangSwitch";
import AdminNotice from "./i18n/AdminNotice";
import AdminShell from "./AdminShell";

export default function AdminLayout({ children }) {
  return (
    <AdminI18nProvider>
      <AdminShell>
        <div className="relative">
          <div className="fixed top-3 right-3 z-[60]">
            <AdminLangSwitch />
          </div>
          {children}
        </div>
      </AdminShell>
    </AdminI18nProvider>
  );
}
