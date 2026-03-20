// frontend/app/admin/layout.jsx
import AdminI18nProvider from "./i18n/AdminI18nProvider";
import AdminShell from "./AdminShell";

export default function AdminLayout({ children }) {
  return (
    <AdminI18nProvider>
      <AdminShell>{children}</AdminShell>
    </AdminI18nProvider>
  );
}
