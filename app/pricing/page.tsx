import Link from 'next/link';

import { MarketingNavbar } from '@/components/navigation/MarketingNavbar';
import { PricingSection } from '@/components/marketing/PricingSection';
import { Button } from '@/components/ui/Button';

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      <MarketingNavbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold text-ink md:text-5xl">
            Pricing
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            One plan. Everything you need to get paid on time.
          </p>
        </div>
      </section>

      <PricingSection />

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-2xl bg-ink px-8 py-12 text-white">
          <h2 className="text-2xl font-semibold">
            Start free. Keep reminders running.
          </h2>
          <p className="mt-2 text-sm text-slate-200">
            Set up your reminder workflow in minutes.
          </p>
          <Link href="/login?mode=signup" className="mt-6 inline-flex">
            <Button>Start free — 14 days</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-slate-500">
          <div className="flex items-center gap-4">
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Login</Link>
          </div>
          <span>© {new Date().getFullYear()} PayNudge</span>
        </div>
      </footer>
    </main>
  );
}
