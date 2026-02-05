"use client";

import { useEffect } from "react";

export default function AdminShell({ children }) {
  useEffect(() => {
    document.body.classList.add("admin-ui");
    return () => document.body.classList.remove("admin-ui");
  }, []);

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
      {children}
    </>
  );
}
