"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAdminI18n } from "./i18n/AdminI18nProvider";
import AdminLangSwitch from "./i18n/AdminLangSwitch";

const ADMIN_LINKS = [
  { href: "/admin/dashboard", key: "dashboard", emoji: "◧" },
  { href: "/admin/packages", key: "packages", emoji: "◫" },
  { href: "/admin/testimonials", key: "testimonials", emoji: "★" },
  { href: "/admin/activity", key: "activity", emoji: "≣" },
];

const PAGE_TITLES = {
  "/admin/dashboard": "admin.dashboard",
  "/admin/packages": "admin.packages",
  "/admin/testimonials": "admin.testimonials",
  "/admin/activity": "admin.activity",
  "/admin/login": "login.title",
};

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function AdminShell({ children }) {
  const pathname = usePathname() || "/admin";
  const { t } = useAdminI18n();
  const isLogin = pathname.startsWith("/admin/login");

  const pageTitle = useMemo(() => {
    if (pathname.startsWith("/admin/packages/new")) return t("packages.newTitle", "New package");
    if (pathname.includes("/edit")) return t("actions.edit", "Edit");
    return t(PAGE_TITLES[pathname], t("admin.title", "Admin"));
  }, [pathname, t]);

  useEffect(() => {
    document.body.classList.add("admin-ui");
    return () => document.body.classList.remove("admin-ui");
  }, []);

  if (isLogin) {
    return (
      <>
        <style jsx global>{`
          body.admin-ui header,
          body.admin-ui footer {
            display: none !important;
          }
          body.admin-ui .whatsapp-float,
          body.admin-ui .telegram-float {
            display: none !important;
          }
          body.admin-ui main {
            padding-top: 0 !important;
          }
        `}</style>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.08),_transparent_45%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
          <div className="absolute top-4 right-4 z-20">
            <AdminLangSwitch />
          </div>
          {children}
        </div>
      </>
    );
  }

  return (
    <>
      <style jsx global>{`
        body.admin-ui header,
        body.admin-ui footer {
          display: none !important;
        }
        body.admin-ui .whatsapp-float,
        body.admin-ui .telegram-float {
          display: none !important;
        }
        body.admin-ui main {
          padding-top: 0 !important;
        }
      `}</style>
      <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] text-slate-900">
        <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
          <aside className="hidden w-[264px] shrink-0 border-r border-slate-200 bg-slate-950 text-slate-100 xl:flex xl:flex-col">
            <div className="border-b border-slate-800 px-6 py-6">
              <div className="text-xs uppercase tracking-[0.28em] text-slate-400">
                {t("admin.title", "Admin")}
              </div>
              <div className="mt-2 text-2xl font-semibold leading-tight">
                {t("brand.company", "Vicuña Adventures")}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                {t("dashboard.operationsHub", "Operations hub for reservations, packages and activity.")}
              </div>
            </div>

            <nav className="flex-1 space-y-1 px-4 py-5">
              {ADMIN_LINKS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={classNames(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                      active
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    )}
                  >
                    <span className="text-base leading-none">{item.emoji}</span>
                    <span>{t(`admin.${item.key}`, item.key)}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-800 px-6 py-5 text-xs text-slate-400">
              {t("dashboard.sidebarHint", "Use the dashboard to catch new reservations fast and keep package content clean.")}
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
              <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      {t("admin.title", "Admin")}
                    </div>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{pageTitle}</h1>
                  </div>
                  <AdminLangSwitch />
                </div>

                <div className="flex gap-2 overflow-x-auto xl:hidden">
                  {ADMIN_LINKS.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={classNames(
                          "whitespace-nowrap rounded-xl border px-3 py-2 text-sm transition",
                          active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {t(`admin.${item.key}`, item.key)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
