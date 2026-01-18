// frontend/app/[locale]/about/page.js
import AboutInner from '@/app/about/page';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AboutPage() {
  return <AboutInner />;
}
