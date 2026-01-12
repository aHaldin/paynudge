'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { reminderRuleSchema } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { HelperText } from '@/components/ui/HelperText';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { createReminderRuleAction } from '@/app/app/settings/reminders/actions';

export type ReminderRuleValues = {
  daysOffset: number;
  tone: 'friendly' | 'neutral' | 'firm';
  enabled: boolean;
};

export function ReminderRuleForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [timing, setTiming] = useState<'before' | 'on' | 'after'>('before');
  const [dayCount, setDayCount] = useState(3);
  const form = useForm<ReminderRuleValues>({
    resolver: zodResolver(reminderRuleSchema),
    defaultValues: { daysOffset: -3, tone: 'friendly', enabled: true }
  });

  useEffect(() => {
    if (timing === 'on') {
      form.setValue('daysOffset', 0, { shouldValidate: true });
      return;
    }
    const normalized = Math.max(1, dayCount || 1);
    const offset = timing === 'before' ? -normalized : normalized;
    form.setValue('daysOffset', offset, { shouldValidate: true });
  }, [timing, dayCount, form]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createReminderRuleAction(values);
      if (result.error) {
        form.setError('root', { message: result.error.form?.[0] });
        return;
      }
      form.reset({ daysOffset: -3, tone: 'friendly', enabled: true });
      setTiming('before');
      setDayCount(3);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" {...form.register('daysOffset', { valueAsNumber: true })} />
      <div className="space-y-1">
        <label className="text-sm font-medium text-ink">
          When should this reminder be sent?
        </label>
        <Select
          value={timing}
          onChange={(event) =>
            setTiming(event.target.value as 'before' | 'on' | 'after')
          }
        >
          <option value="before">Before due date</option>
          <option value="on">On due date</option>
          <option value="after">After due date</option>
        </Select>
      </div>
      {timing === 'before' || timing === 'after' ? (
        <div className="space-y-1">
          <label className="text-sm font-medium text-ink">
            {timing === 'before' ? 'Days before due date' : 'Days after due date'}
          </label>
          <Input
            type="number"
            min={1}
            hasError={!!form.formState.errors.daysOffset}
            value={dayCount}
            onChange={(event) => {
              const next = Number(event.target.value);
              setDayCount(Number.isNaN(next) ? 0 : next);
            }}
          />
          {form.formState.errors.daysOffset ? (
            <HelperText tone="error">
              {form.formState.errors.daysOffset.message}
            </HelperText>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-1">
        <label className="text-sm font-medium text-ink">Tone</label>
        <Select hasError={!!form.formState.errors.tone} {...form.register('tone')}>
          <option value="friendly">Friendly</option>
          <option value="neutral">Neutral</option>
          <option value="firm">Firm</option>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4"
          {...form.register('enabled')}
        />
        <label className="text-sm font-medium">Enabled</label>
      </div>
      {form.formState.errors.root ? (
        <HelperText tone="error">{form.formState.errors.root.message}</HelperText>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Add Rule'}
      </Button>
    </form>
  );
}
