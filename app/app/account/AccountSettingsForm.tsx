'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HelperText } from '@/components/ui/HelperText';
import { Input } from '@/components/ui/Input';
import { accountSettingsSchema } from '@/lib/validation';
import { deleteAccountAction, saveAccountSettingsAction } from './actions';
import { signOut } from '@/app/login/actions';
import { ManageBillingButton } from '@/components/billing/ManageBillingButton';

type AccountSettingsFormValues = {
  senderName: string;
  replyToEmail: string;
  emailSignature: string;
};

type AccountSettingsFormProps = {
  userEmail: string;
  settings: AccountSettingsFormValues;
  billingStatus: string;
};

export function AccountSettingsForm({
  userEmail,
  settings,
  billingStatus
}: AccountSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  const form = useForm<AccountSettingsFormValues>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues: settings
  });

  useEffect(() => {
    form.reset(settings);
  }, [form, settings]);

  const onSubmit = form.handleSubmit((values) => {
    setToast(null);
    startTransition(async () => {
      const result = await saveAccountSettingsAction(values);
      if (result.error) {
        console.error(result.error);
        const message =
          'form' in result.error
            ? result.error.form?.[0] ?? 'Unable to save changes.'
            : 'Unable to save changes.';
        form.setError('root', { message });
        setToast(message);
        return;
      }
      if (result.settings) {
        form.reset({
          senderName: result.settings.sender_name ?? '',
          replyToEmail: result.settings.reply_to_email ?? userEmail,
          emailSignature: result.settings.email_signature ?? ''
        });
      }
      router.refresh();
      setToast('Saved changes.');
      setTimeout(() => setToast(null), 3000);
    });
  });

  return (
    <>
      <form id="account-settings" onSubmit={onSubmit} className="space-y-6">
        <Card title="Sender details">
          <p className="text-sm text-slate-500">
            These details appear in every reminder email you send.{' '}
            <Link
              href="/app#reminder-preview"
              className="text-slate-500 hover:text-ink"
            >
              Preview reminder →
            </Link>
          </p>
          <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">Sender name</label>
            <Input
              placeholder="Andre from Road2Resolve"
              {...form.register('senderName')}
            />
            <Link
              href="/app#reminder-preview"
              className="text-xs text-slate-500 hover:text-ink"
            >
              Used in the email header →
            </Link>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">Reply-to email</label>
            <Input
              placeholder={userEmail}
              hasError={!!form.formState.errors.replyToEmail}
              {...form.register('replyToEmail')}
            />
            <Link
              href="/app#reminder-preview"
              className="text-xs text-slate-500 hover:text-ink"
            >
              Clients reply to this address →
            </Link>
            {form.formState.errors.replyToEmail ? (
              <HelperText tone="error">
                {form.formState.errors.replyToEmail.message}
              </HelperText>
            ) : null}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">Email signature</label>
            <textarea
              rows={4}
              placeholder={'Best regards,\nAndre\nRoad2Resolve'}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-ink focus:ring-2 focus:ring-slate-100"
              {...form.register('emailSignature')}
            />
            <Link
              href="/app#reminder-preview"
              className="text-xs text-slate-500 hover:text-ink"
            >
              Shown at the bottom of reminder emails →
            </Link>
          </div>
          {form.formState.errors.root ? (
            <HelperText tone="error">{form.formState.errors.root.message}</HelperText>
          ) : null}
          </div>
        </Card>
      </form>

      <div className="flex items-center justify-between">
        {toast ? (
          <div className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            {toast}
          </div>
        ) : (
          <span />
        )}
        <Button type="submit" form="account-settings" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save changes'}
        </Button>
      </div>

      <Card title="Danger zone">
        <div className="flex flex-wrap items-center gap-3">
          <form action={signOut}>
            <Button variant="secondary" type="submit">
              Sign out
            </Button>
          </form>
          <Button
            type="button"
            variant="secondary"
            className="border border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete account
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Deleting your account removes your PayNudge data but does not affect
          your external billing.
        </p>
      </Card>

      <Card title="Billing">
        <p className="text-sm text-slate-500">
          Billing status: <span className="font-semibold text-ink">{billingStatus}</span>
        </p>
        <div className="mt-4">
          <ManageBillingButton />
        </div>
      </Card>

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-ink">
              Delete account?
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              This deletes your PayNudge data (clients, invoices, rules).
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  startTransition(async () => {
                    await deleteAccountAction();
                  });
                }}
                disabled={isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {isPending ? 'Deleting...' : 'Delete account'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
