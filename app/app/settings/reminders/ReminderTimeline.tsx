'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatDate, formatGBP } from '@/lib/format';
import { defaultTemplates } from '@/lib/reminders/templates-defaults';
import { renderReminderContent, SenderProfile } from '@/lib/email/renderReminder';
import {
  deleteReminderRuleAction,
  updateReminderRuleAction
} from '@/app/app/settings/reminders/actions';

type ReminderRule = {
  id: string;
  days_offset: number;
  tone: 'friendly' | 'neutral' | 'firm';
  enabled: boolean;
};

type ReminderTemplate = {
  tone: 'friendly' | 'neutral' | 'firm';
  subject: string;
  body: string;
};

type PreviewInvoice = {
  invoice_number: string;
  amount_pennies: number;
  due_date: string;
  issue_date: string;
  clients: { name: string; email: string } | null;
};

type ReminderTimelineProps = {
  rules: ReminderRule[];
  templates: ReminderTemplate[];
  previewInvoice: PreviewInvoice | null;
  businessName: string;
  senderProfile?: SenderProfile | null;
};

function describeTiming(daysOffset: number) {
  if (daysOffset === 0) return 'On the due date';
  if (daysOffset < 0) {
    return `${Math.abs(daysOffset)} days before due date`;
  }
  return `${daysOffset} days after due date`;
}

export function ReminderTimeline({
  rules,
  templates,
  previewInvoice,
  businessName,
  senderProfile
}: ReminderTimelineProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [previewRuleId, setPreviewRuleId] = useState<string | null>(null);
  const [activeMenuRuleId, setActiveMenuRuleId] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editTiming, setEditTiming] = useState<'before' | 'on' | 'after'>(
    'before'
  );
  const [editDays, setEditDays] = useState(3);
  const [confirmDeleteRuleId, setConfirmDeleteRuleId] = useState<string | null>(
    null
  );

  const templateByTone = useMemo(() => {
    return new Map(templates.map((template) => [template.tone, template]));
  }, [templates]);

  const defaultTemplateByTone = useMemo(() => {
    return new Map(defaultTemplates.map((template) => [template.tone, template]));
  }, []);

  const groupedRules = useMemo(() => {
    const sorted = [...rules].sort((a, b) => a.days_offset - b.days_offset);
    return {
      before: sorted.filter((rule) => rule.days_offset < 0),
      on: sorted.filter((rule) => rule.days_offset === 0),
      after: sorted.filter((rule) => rule.days_offset > 0)
    };
  }, [rules]);

  const exampleInvoice: PreviewInvoice = {
    invoice_number: 'INV-1043',
    amount_pennies: 125000,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    issue_date: new Date().toISOString(),
    clients: { name: 'Avery Studio', email: 'hello@averystudio.com' }
  };

  const previewBase = previewInvoice ?? exampleInvoice;

  const sections = [
    { key: 'before', label: 'Before due date', rules: groupedRules.before },
    { key: 'on', label: 'On due date', rules: groupedRules.on },
    { key: 'after', label: 'After due date', rules: groupedRules.after }
  ] as const;

  const beginEdit = (rule: ReminderRule) => {
    setEditingRuleId(rule.id);
    setActiveMenuRuleId(null);
    if (rule.days_offset === 0) {
      setEditTiming('on');
      setEditDays(1);
      return;
    }
    if (rule.days_offset < 0) {
      setEditTiming('before');
      setEditDays(Math.abs(rule.days_offset));
      return;
    }
    setEditTiming('after');
    setEditDays(rule.days_offset);
  };

  const handleSaveTiming = (rule: ReminderRule) => {
    const normalized = Math.max(1, editDays || 1);
    const daysOffset =
      editTiming === 'on' ? 0 : editTiming === 'before' ? -normalized : normalized;

    startTransition(async () => {
      const result = await updateReminderRuleAction({
        id: rule.id,
        daysOffset,
        enabled: rule.enabled
      });
      if (result.error) {
        return;
      }
      setEditingRuleId(null);
      router.refresh();
    });
  };

  const toggleRule = (rule: ReminderRule) => {
    startTransition(async () => {
      const result = await updateReminderRuleAction({
        id: rule.id,
        daysOffset: rule.days_offset,
        enabled: !rule.enabled
      });
      if (result.error) {
        return;
      }
      setActiveMenuRuleId(null);
      router.refresh();
    });
  };

  const confirmDelete = () => {
    if (!confirmDeleteRuleId) return;
    startTransition(async () => {
      const result = await deleteReminderRuleAction(confirmDeleteRuleId);
      if (result.error) {
        return;
      }
      setConfirmDeleteRuleId(null);
      router.refresh();
    });
  };

  const previewRule = rules.find((rule) => rule.id === previewRuleId) ?? null;
  const previewTemplate = previewRule
    ? templateByTone.get(previewRule.tone) ??
      defaultTemplateByTone.get(previewRule.tone) ??
      null
    : null;
  const isDefaultTemplate =
    !!previewRule && !templateByTone.get(previewRule.tone);
  const previewRendered =
    previewRule && previewTemplate
      ? renderReminderContent({
          templateSubject: previewTemplate.subject,
          templateBody: previewTemplate.body,
          tone: previewRule.tone,
          daysOffset: previewRule.days_offset,
          clientName: previewBase.clients?.name ?? 'Client',
          invoiceNumber: previewBase.invoice_number,
          amount: formatGBP(previewBase.amount_pennies),
          dueDate: formatDate(previewBase.due_date),
          issueDate: formatDate(previewBase.issue_date),
          businessName,
          senderProfile
        })
      : null;

  return (
    <div className="space-y-6">
      {rules.length === 0 ? (
        <p className="text-sm text-slate-500">
          No rules yet. Add a few to start nudging.
        </p>
      ) : (
        sections.map((section) => (
          <div key={section.key} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {section.label}
            </h3>
            {section.rules.length === 0 ? (
              <p className="text-sm text-slate-500">No reminders here yet.</p>
            ) : (
              <div className="space-y-3">
                {section.rules.map((rule) => {
                  const toneLabel =
                    rule.tone.charAt(0).toUpperCase() + rule.tone.slice(1);
                  const timingLabel = describeTiming(rule.days_offset);
                  const isEditing = editingRuleId === rule.id;
                  const hasTemplate =
                    templateByTone.get(rule.tone) ??
                    defaultTemplateByTone.get(rule.tone);

                  return (
                    <div
                      key={rule.id}
                      className="rounded-lg border border-slate-100 bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {toneLabel} - {timingLabel}
                          </p>
                          <p className="text-xs text-slate-500">
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              rule.enabled
                                ? 'bg-green-50 text-green-600'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setPreviewRuleId(rule.id)}
                            disabled={!hasTemplate}
                          >
                            Preview this email
                          </Button>
                          <div className="relative">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                setActiveMenuRuleId(
                                  activeMenuRuleId === rule.id ? null : rule.id
                                )
                              }
                            >
                              More
                            </Button>
                            {activeMenuRuleId === rule.id ? (
                              <div className="absolute right-0 mt-2 w-48 rounded-md border border-slate-200 bg-white p-2 text-sm shadow-lg">
                                <button
                                  type="button"
                                  className="w-full rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                                  onClick={() => beginEdit(rule)}
                                >
                                  Edit timing
                                </button>
                                <button
                                  type="button"
                                  className="w-full rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                                  onClick={() => toggleRule(rule)}
                                >
                                  {rule.enabled ? 'Disable rule' : 'Enable rule'}
                                </button>
                                <button
                                  type="button"
                                  className="w-full rounded-md px-3 py-2 text-left text-red-600 hover:bg-slate-50"
                                  onClick={() => {
                                    setConfirmDeleteRuleId(rule.id);
                                    setActiveMenuRuleId(null);
                                  }}
                                >
                                  Delete rule
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
                          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold uppercase text-slate-400">
                                Timing
                              </label>
                              <select
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                                value={editTiming}
                                onChange={(event) =>
                                  setEditTiming(
                                    event.target.value as 'before' | 'on' | 'after'
                                  )
                                }
                              >
                                <option value="before">Before due date</option>
                                <option value="on">On due date</option>
                                <option value="after">After due date</option>
                              </select>
                            </div>
                            {editTiming === 'on' ? (
                              <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase text-slate-400">
                                  Days
                                </label>
                                <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                                  Sent on due date
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase text-slate-400">
                                  Days
                                </label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={editDays}
                                  onChange={(event) =>
                                    setEditDays(Number(event.target.value))
                                  }
                                />
                              </div>
                            )}
                          </div>
                          <div className="mt-4 flex items-center gap-2">
                            <Button
                              type="button"
                              onClick={() => handleSaveTiming(rule)}
                              disabled={isPending}
                            >
                              {isPending ? 'Saving...' : 'Save timing'}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setEditingRuleId(null)}
                              disabled={isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}

      {previewRule && previewRendered ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-ink">
                  Reminder preview
                </h3>
                <p className="text-sm text-slate-500">
                  This is exactly what your client will receive.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPreviewRuleId(null)}
              >
                Close
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {previewRule.tone.charAt(0).toUpperCase() +
                    previewRule.tone.slice(1)}
                </span>
                <span>{describeTiming(previewRule.days_offset)}</span>
                {isDefaultTemplate ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Default template
                  </span>
                ) : null}
              </div>

              <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Recipient
                  </p>
                  <p className="mt-1 font-semibold text-ink">
                    {previewBase.clients?.name ?? 'Client'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {previewBase.clients?.email ?? 'client@example.com'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Invoice
                  </p>
                  <p className="mt-1 font-semibold text-ink">
                    {previewBase.invoice_number}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatGBP(previewBase.amount_pennies)} - Due{' '}
                    {formatDate(previewBase.due_date)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Subject
                </p>
                <p className="mt-2 text-base font-semibold text-ink">
                  {previewRendered.subject}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 whitespace-pre-line">
                {previewRendered.text}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDeleteRuleId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-ink">
              Delete reminder rule?
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              This reminder will no longer be sent for any invoices. Existing
              invoices will not be affected otherwise.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmDeleteRuleId(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDelete}
                disabled={isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {isPending ? 'Deleting...' : 'Delete rule'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
