// frontend/app/[locale]/contact/page.js
import ContactInner from '@/app/contact/page';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ContactPage() {
  return <ContactInner />;
}
