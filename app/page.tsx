import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { MarketingNavbar } from '@/components/navigation/MarketingNavbar';
import { PricingSection } from '@/components/marketing/PricingSection';

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-white">
      <MarketingNavbar />

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-semibold leading-tight text-ink md:text-5xl">
              Get paid on time — without chasing clients.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
              PayNudge automatically sends polite invoice reminders so you stay
              professional and get paid faster.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                'Friendly nudges',
                'Clear cashflow',
                'Stay professional'
              ].map((benefit) => (
                <span
                  key={benefit}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  {benefit}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/login?mode=signup" className="w-full sm:w-auto">
                <Button className="w-full px-6">Start free — 14 days</Button>
              </Link>
              <Link
                href="#pricing"
                className="text-sm text-slate-600 hover:text-ink sm:self-center"
              >
                See pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Set up in minutes. No card required. Cancel anytime.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-base font-semibold text-ink">
                Your PayNudge dashboard
              </h2>
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
                Live preview
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Total outstanding', value: '£1,250.00' },
                { label: 'Overdue invoices', value: '2' },
                { label: 'Next reminder', value: 'Tomorrow' }
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <p className="text-[11px] text-slate-500">{stat.label}</p>
                  <p className="text-sm font-semibold text-ink">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-100">
              <div className="grid grid-cols-4 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
                <span>Invoice</span>
                <span>Client</span>
                <span>Status</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs text-slate-600">
                {[
                  {
                    invoice: '#104',
                    client: 'Road2Resolve',
                    status: 'Due in 3 days',
                    amount: '£150.00'
                  },
                  {
                    invoice: '#103',
                    client: 'Acme Studio',
                    status: 'Overdue',
                    amount: '£500.00'
                  }
                ].map((row) => (
                  <div key={row.invoice} className="grid grid-cols-4 px-3 py-2">
                    <span className="font-semibold text-ink">{row.invoice}</span>
                    <span>{row.client}</span>
                    <span>{row.status}</span>
                    <span className="text-right font-semibold text-ink">
                      {row.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs font-semibold text-green-600">
              Automated reminder scheduled
            </p>
          </div>
        </div>
      </section>

      <PricingSection />
    </main>
  );
}
