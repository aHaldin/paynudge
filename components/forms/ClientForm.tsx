'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { clientSchema } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { HelperText } from '@/components/ui/HelperText';
import { Input } from '@/components/ui/Input';
import { createClientAction } from '@/app/app/clients/actions';

export type ClientFormValues = {
  name: string;
  email: string;
  companyName?: string;
  notes?: string;
};

type ClientFormProps = {
  onCreated?: (client: {
    id: string;
    name: string;
    email: string;
    company_name: string | null;
    notes: string | null;
  }) => void;
};

export function ClientForm({ onCreated }: ClientFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      email: '',
      companyName: '',
      notes: ''
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createClientAction(values);
      if (result.error) {
        const formError = (result.error as { form?: string[] }).form?.[0];
        form.setError('root', {
          message: formError ?? 'Unable to save client.'
        });
        return;
      }
      form.reset();
      if (result.client) {
        onCreated?.(result.client);
      } else {
        router.refresh();
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-ink">Client name</label>
        <Input
          hasError={!!form.formState.errors.name}
          {...form.register('name')}
        />
        {form.formState.errors.name ? (
          <HelperText tone="error">
            {form.formState.errors.name.message}
          </HelperText>
        ) : null}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-ink">Email</label>
        <Input
          type="email"
          hasError={!!form.formState.errors.email}
          {...form.register('email')}
        />
        <HelperText>Used for reminders</HelperText>
        {form.formState.errors.email ? (
          <HelperText tone="error">
            {form.formState.errors.email.message}
          </HelperText>
        ) : null}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-ink">Company</label>
        <Input {...form.register('companyName')} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-ink">Notes</label>
        <textarea
          rows={4}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-ink focus:ring-2 focus:ring-slate-100"
          {...form.register('notes')}
        />
      </div>
      {form.formState.errors.root ? (
        <HelperText tone="error">{form.formState.errors.root.message}</HelperText>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Add Client'}
      </Button>
    </form>
  );
}
