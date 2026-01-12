'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { reminderTemplateSchema } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { HelperText } from '@/components/ui/HelperText';
import { Input } from '@/components/ui/Input';
import { saveReminderTemplateAction } from '@/app/app/settings/reminders/actions';

export type ReminderTemplateValues = {
  tone: 'friendly' | 'neutral' | 'firm';
  subject: string;
  body: string;
};

export function ReminderTemplateForm({
  tone,
  subject,
  body
}: ReminderTemplateValues) {
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<ReminderTemplateValues>({
    resolver: zodResolver(reminderTemplateSchema),
    defaultValues: { tone, subject, body }
  });

  const onSubmit = form.handleSubmit((values) => {
    setSuccessMessage(null);
    startTransition(async () => {
      const result = await saveReminderTemplateAction(values);
      if (result.error) {
        form.setError('root', { message: result.error.form?.[0] });
        return;
      }
      form.clearErrors('root');
      setSuccessMessage('Saved.');
      setTimeout(() => setSuccessMessage(null), 2000);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Subject
        </label>
        <Input
          hasError={!!form.formState.errors.subject}
          {...form.register('subject')}
        />
        {form.formState.errors.subject ? (
          <HelperText tone="error">
            {form.formState.errors.subject.message}
          </HelperText>
        ) : null}
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Body
        </label>
        <textarea
          className={`min-h-[140px] w-full rounded-md border px-3 py-2 text-sm outline-none transition ${
            form.formState.errors.body
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : 'border-slate-200 focus:border-ink focus:ring-2 focus:ring-slate-100'
          }`}
          {...form.register('body')}
        />
        {form.formState.errors.body ? (
          <HelperText tone="error">
            {form.formState.errors.body.message}
          </HelperText>
        ) : null}
      </div>
      <HelperText>
        Available tokens: {'{{client_name}}'}, {'{{invoice_number}}'}, {'{{amount}}'},
        {'{{due_date}}'}, {'{{timing}}'}, {'{{timing_line}}'}, {'{{days_offset}}'}
      </HelperText>
      {form.formState.errors.root ? (
        <HelperText tone="error">{form.formState.errors.root.message}</HelperText>
      ) : null}
      {successMessage ? <HelperText>{successMessage}</HelperText> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save template'}
      </Button>
    </form>
  );
}
