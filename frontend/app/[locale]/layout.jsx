//frontend/app/[locale]layout.jsx
export default function LocaleLayout({ children }) {
  // Per-locale wrappers or providers could go here if needed,
  // but DO NOT render NavBar or Footer here.
  return <>{children}</>;
}
