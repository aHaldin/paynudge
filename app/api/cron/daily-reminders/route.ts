import { NextResponse } from 'next/server';

import { runDailyReminderJob } from '@/lib/reminders/job';

export async function POST(request: Request) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runDailyReminderJob();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error('Cron job failed', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
