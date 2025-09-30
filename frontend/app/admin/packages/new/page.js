// frontend/app/admin/packages/new/page.js
import { Suspense } from 'react';
import NewPackageInner from './NewPackageInner';

export default function NewPackagePage() {
  return (
    <main>
      <Suspense fallback={<div className="p-6">Loading form…</div>}>
        <NewPackageInner />
      </Suspense>
    </main>
  );
}
