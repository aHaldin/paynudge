# PayNudge

Production-ready SaaS MVP for automated invoice reminders.

## Features
- Supabase Auth sign up / log in
- Clients and invoices management
- Reminder rules with tone selection
- Daily cron job that sends reminders and logs them
- Dashboard metrics for outstanding and overdue invoices
- Row Level Security for multi-tenant isolation

## Tech stack
- Next.js 14 App Router + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres)
- Resend (email)
- OpenAI (optional, human-sounding emails)
- Zod + React Hook Form

## Setup
1. Create a Supabase project.
2. Run the SQL migration in `supabase/migrations/0001_init.sql`.
3. Create an `.env.local` with the following:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
OPENAI_API_KEY=
CRON_SECRET=
RESEND_FROM=
```

`OPENAI_API_KEY` is optional. `RESEND_FROM` defaults to `PayNudge billing@YOURDOMAIN` if not set.

4. Install dependencies and run the app:

```
npm install
npm run dev
```

## Daily reminder job
The cron endpoint is a protected route handler:

```
POST /api/cron/daily-reminders
x-cron-secret: YOUR_CRON_SECRET
```

This calls `runDailyReminderJob()` in `lib/reminders/job.ts` and returns a summary of reminders sent.

## Notes
- Money is stored in pennies and formatted as GBP in the UI.
- RLS ensures each user can only access their own data.
- The reminder job skips duplicates within 24 hours for the same invoice + rule.
- Reminder templates can be customized per tone in Settings and support tokens like `{{invoice_number}}`.
