<<<<<<< HEAD
// frontend/app/packages/page.js
import { Suspense } from 'react';
import PackagesInner from '@/app/[locale]/packages/PackagesInner';


export default function PackagesPage() {
  return (
    <main>
      <Suspense fallback={<div className="p-6">Loading packages…</div>}>
        <PackagesInner initial={{}} />
      </Suspense>
    </main>
  );
}
=======
// frontend/app/packages/page.js
import { Suspense } from 'react';
import PackagesInner from '@/app/packages/PackagesInner';


export default function PackagesPage() {
  return (
    <main>
      <Suspense fallback={<div className="p-6">Loading packages…</div>}>
        <PackagesInner initial={{}} />
      </Suspense>
    </main>
  );
}
>>>>>>> 72d948c6d1c7d86949e7e46b13be97d4a318e6d9
