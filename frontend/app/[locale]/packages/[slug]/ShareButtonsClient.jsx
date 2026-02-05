"use client";

import { MessageCircle } from "lucide-react";
import { trackEvent } from "@/app/lib/analytics";

export default function ShareButtonsClient({ share, label, packageSlug }) {
  if (!share) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="text-slate-700 font-medium" style={{ fontFamily: "'Bree Serif', serif" }}>
        {label}:
      </div>
      <div className="flex gap-2">
        <a
          href={share.wa}
          className="p-2 rounded-full bg-gradient-to-br from-[#A3B117]/10 to-[#0086C0]/5 border border-slate-200 hover:border-[#A3B117] hover:shadow-md transition-all duration-300"
          target="_blank"
          rel="noopener noreferrer"
          title="WhatsApp"
          onClick={() =>
            trackEvent("cta_whatsapp_click", {
              source: "package_share",
              packageSlug: packageSlug || "",
            })
          }
        >
          <MessageCircle className="w-4 h-4 text-slate-600" />
        </a>

        <a
          href={share.tg}
          className="p-2 rounded-full bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/5 border border-slate-200 hover:border-[#0086C0] hover:shadow-md transition-all duration-300"
          target="_blank"
          rel="noopener noreferrer"
          title="Telegram"
          onClick={() =>
            trackEvent("cta_telegram_click", {
              source: "package_share",
              packageSlug: packageSlug || "",
            })
          }
        >
          <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9.993 15.496 9.63 20.62c.52 0 .744-.224 1.013-.493l2.43-2.32 5.03 3.68c.922.51 1.573.242 1.82-.85L23.93 4.77c.32-1.34-.484-1.94-1.38-1.61L1.36 11.29c-1.31.51-1.29 1.24-.24 1.57l5.57 1.74L19.64 6.9c.61-.4 1.17-.18.71.23" />
          </svg>
        </a>

        <a
          href={share.fb}
          className="p-2 rounded-full bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/5 border border-slate-200 hover:border-[#0086C0] hover:shadow-md transition-all duration-300"
          target="_blank"
          rel="noopener noreferrer"
          title="Facebook"
          onClick={() =>
            trackEvent("share_facebook_click", {
              source: "package_share",
              packageSlug: packageSlug || "",
            })
          }
        >
          <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
