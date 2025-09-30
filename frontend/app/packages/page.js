// frontend/app/packages/page.js
import { Suspense } from 'react';
import PackagesInner from './PackagesInner';

export default function PackagesPage() {
  return (
    <main>
      <Suspense fallback={<div className="p-6">Loading packages…</div>}>
        <PackagesInner initial={{}} />
      </Suspense>
    </main>
  );
}
