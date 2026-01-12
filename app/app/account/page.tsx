import { Card } from '@/components/ui/Card';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import { AccountSettingsForm } from '@/app/app/account/AccountSettingsForm';

export default async function AccountPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: settings } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  let accountSettings = settings;

  if (!accountSettings) {
    const now = new Date();
    const endsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const { data: created } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          reply_to_email: user.email ?? null,
          trial_ends_at: endsAt.toISOString(),
          has_access: true
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();
    accountSettings = created ?? null;
  }

  const memberSince = user.created_at ? formatDate(user.created_at) : null;

  return (
    <div className="space-y-6">
      <Card title="Account">
        <div className="grid gap-4 text-sm text-slate-600">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Email</p>
            <p className="mt-1 font-semibold text-ink">{user.email}</p>
          </div>
          {memberSince ? (
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Member since
              </p>
              <p className="mt-1 text-slate-600">{memberSince}</p>
            </div>
          ) : null}
        </div>
      </Card>

      <AccountSettingsForm
        userEmail={user.email ?? ''}
        settings={{
          senderName: accountSettings?.sender_name ?? '',
          replyToEmail: accountSettings?.reply_to_email ?? user.email ?? '',
          emailSignature: accountSettings?.email_signature ?? ''
        }}
        billingStatus={(() => {
          if (process.env.NEXT_PUBLIC_BILLING_ENABLED !== 'true') {
            return 'Billing disabled';
          }
          const status = accountSettings?.subscription_status ?? null;
          if (status === 'active' || status === 'trialing') return 'Active';
          if (accountSettings?.trial_ends_at) {
            const trialEnds = new Date(accountSettings.trial_ends_at);
            if (trialEnds.getTime() > Date.now()) return 'Trial active';
          }
          return 'Trial ended';
        })()}
      />
    </div>
  );
}
