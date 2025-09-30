//frontend/app/admin/packages/new/NewPackageInner.jsx
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminGuard from '@/app/admin/AdminGuard';
import PackageForm from '../_form';

export default function NewPackageInner() {
  const router = useRouter();

  return (
    <AdminGuard>
      <section className="container-default py-8">
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

        <h2 className="text-2xl font-bold mb-4">Create new package</h2>

        <PackageForm
          onSaved={(doc) => {
            const id = doc?._id || doc?.id;
            if (id) router.replace(`/admin/packages/${id}/edit`);
            else router.replace('/admin/packages');
          }}
        />
      </section>
    </AdminGuard>
  );
}
