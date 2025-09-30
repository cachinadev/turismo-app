import { Suspense } from 'react';
import PackagesInner from './PackagesInner';

export default function AdminPackagesPage() {
  return (
    <main>
      <Suspense fallback={<div className="p-6">Loading packages…</div>}>
        <PackagesInner />
      </Suspense>
    </main>
  );
}
