import { Suspense } from "react";
import TestimonialsInner from "./testimonials-inner";

export default function AdminTestimonialsPage() {
  return (
    <main>
      <Suspense fallback={<div className="p-6">Loading testimonials…</div>}>
        <TestimonialsInner />
      </Suspense>
    </main>
  );
}
