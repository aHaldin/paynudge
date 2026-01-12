import Link from 'next/link';

import { Button } from '@/components/ui/Button';

const features = [
  'Unlimited clients & invoices',
  'Automated reminder schedules',
  'Friendly → firm follow-ups',
  'Custom sender name & email signature',
  '14-day free trial (no card required)'
];

const faqs = [
  {
    question: 'Do I need a card to start?',
    answer: 'No. Start your 14-day trial with no card required.'
  },
  {
    question: 'What happens after 14 days?',
    answer: 'You can subscribe to keep reminders running.'
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. Cancel from your billing portal at any time.'
  },
  {
    question: 'Will my clients see PayNudge branding?',
    answer: 'No. Emails come from your sender details.'
  }
];

export function PricingSection() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-semibold text-[#0F172A] md:text-4xl">
          Simple pricing. No chasing. Get paid.
        </h2>
        <p className="mt-3 text-lg text-slate-600">
          One plan. Everything you need to get paid on time.
        </p>
      </div>

      <div className="mt-10 flex justify-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">PayNudge</p>
              <p className="mt-2 text-3xl font-semibold text-[#0F172A]">
                £9.99 <span className="text-base font-medium text-slate-500">/ month</span>
              </p>
              <p className="mt-2 text-sm text-slate-600">
                14-day free trial — no card required
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Polite, automatic invoice reminders — without awkward follow-ups.
              </p>
            </div>
          </div>
          <ul className="mt-6 space-y-3 text-sm text-slate-600">
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <div className="mt-6">
            <Link href="/login?mode=signup" className="block w-full">
              <Button className="w-full px-6">Start free — 14 days</Button>
            </Link>
            <p className="mt-3 text-center text-xs text-slate-500">
              Cancel anytime.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-2xl font-semibold text-ink">FAQ</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <div
              key={faq.question}
              className="rounded-xl border border-slate-200 bg-white p-4 text-sm"
            >
              <p className="font-semibold text-ink">{faq.question}</p>
              <p className="mt-2 text-slate-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
