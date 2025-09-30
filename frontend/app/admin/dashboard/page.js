// frontend/app/admin/dashboard/page.js
import { Suspense } from "react";
import DashboardInner from "./DashboardInner";

// ✅ This is the server component wrapper
export default function DashboardPage() {
  return (
    <main>
      <Suspense fallback={<div className="p-6">Loading dashboard…</div>}>
        <DashboardInner />
      </Suspense>
    </main>
  );
}
