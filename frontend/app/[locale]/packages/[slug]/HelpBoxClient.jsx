"use client";

import { MessageCircle, Mail, ChevronRight } from "lucide-react";
import { trackEvent } from "@/app/lib/analytics";

const normalizePhone = (p) => (String(p || "").match(/\d+/g) || []).join("");

export default function HelpBoxClient({ title, canonical, labels, email, waNumber }) {
  const wa = normalizePhone(waNumber);
  const waHref = wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent(`Hi! I'm interested in "${title}". ${canonical || ""}`)}`
    : null;
  const emailHref = email ? `mailto:${email}` : null;

  return (
    <div className="bg-gradient-to-br from-[#A3B117]/5 to-[#0086C0]/5 rounded-2xl border border-[#A3B117]/20 p-6">
      <div className="font-bold text-[#0E374A] mb-2 flex items-center gap-2" style={{ fontFamily: "'Bree Serif', serif" }}>
        <MessageCircle className="w-5 h-5 text-[#A3B117]" />
        {labels?.questions || "Questions?"}
      </div>
      <div className="text-sm text-slate-600 mb-4" style={{ fontFamily: "'Bree Serif', serif" }}>
        {labels?.helpText || "Message us on WhatsApp or email — we'll help you plan your trip."}
      </div>

      <div className="flex flex-col gap-3">
        <a
          href={waHref || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-white rounded-xl border border-slate-200 p-3 hover:border-[#A3B117] hover:shadow-md transition-all duration-300 flex items-center gap-3"
          onClick={(e) => {
            if (!waHref) e.preventDefault();
            if (waHref) {
              trackEvent("cta_whatsapp_click", {
                source: "package_help_box",
                packageSlug: canonical?.split("/").pop() || "",
              });
            }
          }}
        >
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#A3B117]/10 to-[#0086C0]/5">
            <MessageCircle className="w-5 h-5 text-[#A3B117]" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-[#0E374A]" style={{ fontFamily: "'Bree Serif', serif" }}>
              {labels?.chat || "Chat on WhatsApp"}
            </div>
            <div className="text-xs text-slate-500" style={{ fontFamily: "'Bree Serif', serif" }}>
              {labels?.quickResponse || "Quick response • 24/7"}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#A3B117] group-hover:translate-x-1 transition-all" />
        </a>

        <a
          href={emailHref || "#"}
          className="group bg-white rounded-xl border border-slate-200 p-3 hover:border-[#0086C0] hover:shadow-md transition-all duration-300 flex items-center gap-3"
          onClick={(e) => {
            if (!emailHref) e.preventDefault();
          }}
        >
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/5">
            <Mail className="w-5 h-5 text-[#0086C0]" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-[#0E374A]" style={{ fontFamily: "'Bree Serif', serif" }}>
              {labels?.email || "Email us"}
            </div>
            <div className="text-xs text-slate-500" style={{ fontFamily: "'Bree Serif', serif" }}>
              {labels?.emailDetail || "Detailed inquiries • Attachments"}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0086C0] group-hover:translate-x-1 transition-all" />
        </a>
      </div>
    </div>
  );
}
