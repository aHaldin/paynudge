import { LoginForm } from '@/components/forms/LoginForm';
import { MarketingNavbar } from '@/components/navigation/MarketingNavbar';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white">
      <MarketingNavbar />
      <div className="mx-auto flex max-w-6xl flex-col px-6 py-12 md:py-16">
        <div className="grid items-center gap-10 md:grid-cols-[1.15fr_1fr]">
          <div className="max-w-lg">
            <h1 className="text-3xl font-semibold leading-tight text-ink md:text-4xl">
              Get paid on time - without awkward follow-ups.
            </h1>
            <p className="mt-3 text-base text-slate-600">
              Your reminders, invoices, and clients - all in one place.
            </p>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              <p className="font-semibold text-ink">Quietly in the background</p>
              <p className="mt-2">
                PayNudge keeps follow-ups polite and consistent, so you can stay
                focused on your work.
              </p>
            </div>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
