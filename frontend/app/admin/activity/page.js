import { Suspense } from "react";
import ActivityInner from "./activity-inner";

export default function AdminActivityPage() {
  return (
    <main>
      <Suspense fallback={<div className="p-6">Loading activity…</div>}>
        <ActivityInner />
      </Suspense>
    </main>
  );
}
