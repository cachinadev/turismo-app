// frontend/app/admin/packages/new/NewPackageInner.jsx
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminGuard from '@/app/admin/AdminGuard';
import PackageForm from '../_form';

// Must match PackagesInner.jsx
const FLASH_KEY = 'pkg_created_flash';

export default function NewPackageInner() {
  const router = useRouter();

  return (
    <AdminGuard>
      <section className="container-default py-20">
        {/* Breadcrumbs + quick actions */}
        <div className="flex items-center justify-between gap-3 mb-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Link href="/admin/packages" className="hover:underline">
              Packages
            </Link>
            <span>›</span>
            <span className="text-slate-800">New</span>
          </div>
          <Link href="/admin/packages" className="btn btn-ghost">
            ← Back to list
          </Link>
        </div>

        <h2 className="text-2xl font-bold mb-4 pt-10">Create new package</h2>

        <PackageForm
          onSaved={(doc) => {
            // Store a one-time "congrats" flash and go back to list
            try {
              const payload = {
                t: Date.now(),
                id: doc?._id || doc?.id || '',
                title: doc?.title || 'Package created successfully!',
                slug: doc?.slug || '',
              };
              sessionStorage.setItem(FLASH_KEY, JSON.stringify(payload));
            } catch {
              // ignore storage errors (private mode, etc.)
            }

            // Show the banner in /admin/packages (PackagesInner.jsx)
            router.push('/admin/packages?created=1');
          }}
        />
      </section>
    </AdminGuard>
  );
}
