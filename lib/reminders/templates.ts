export type ReminderTone = 'friendly' | 'neutral' | 'firm';

type TemplateInput = {
  tone: ReminderTone;
  daysOffset: number;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  clientName: string;
};

export type TemplateRenderInput = TemplateInput & {
  emailSignature?: string;
};

const templateTokens = [
  'invoice_number',
  'amount',
  'due_date',
  'client_name',
  'days_offset',
  'timing',
  'timing_line',
  'email_signature'
] as const;

export function renderTemplate(template: string, input: TemplateRenderInput) {
  const timing = buildTimingLabel(input.daysOffset);
  const timingLine = buildTimingLine(input.daysOffset);
  const replacements: Record<(typeof templateTokens)[number], string> = {
    invoice_number: input.invoiceNumber,
    amount: input.amount,
    due_date: input.dueDate,
    client_name: input.clientName,
    days_offset: String(input.daysOffset),
    timing,
    timing_line: timingLine,
    email_signature: input.emailSignature ?? ''
  };

  return template.replace(/\{\{(.*?)\}\}/g, (_, token: string) => {
    const key = token.trim() as keyof typeof replacements;
    return replacements[key] ?? `{{${token}}}`;
  });
}

export function buildSubject({ tone, daysOffset, invoiceNumber }: TemplateInput) {
  const timing = buildTimingLabel(daysOffset);

  const tonePrefix =
    tone === 'friendly'
      ? 'Quick reminder'
      : tone === 'neutral'
        ? 'Invoice reminder'
        : 'Action required';

  return `${tonePrefix}: Invoice ${invoiceNumber} ${timing}`;
}

export function buildFallbackBody({
  tone,
  daysOffset,
  invoiceNumber,
  amount,
  dueDate,
  clientName
}: TemplateInput) {
  const timingLine = buildTimingLine(daysOffset);

  const toneLine =
    tone === 'friendly'
      ? 'If you have already arranged payment, please ignore this note.'
      : tone === 'neutral'
        ? 'Please let us know if you need any details to complete payment.'
        : 'Please arrange payment at your earliest convenience.';

  return `Hi ${clientName},\n\n${timingLine}\n\nInvoice: ${invoiceNumber}\nAmount: ${amount}\nDue date: ${dueDate}\n\n${toneLine}\n\n-- PayNudge`;
}

function buildTimingLabel(daysOffset: number) {
  if (daysOffset === 0) return 'due today';
  if (daysOffset > 0) {
    return `overdue by ${daysOffset} day${daysOffset === 1 ? '' : 's'}`;
  }
  return `due in ${Math.abs(daysOffset)} day${daysOffset === -1 ? '' : 's'}`;
}

function buildTimingLine(daysOffset: number) {
  if (daysOffset === 0) {
    return 'This is a quick reminder that the invoice is due today.';
  }
  if (daysOffset > 0) {
    return `This invoice is now ${daysOffset} day${daysOffset === 1 ? '' : 's'} overdue.`;
  }
  return `This invoice is due in ${Math.abs(daysOffset)} day${daysOffset === -1 ? '' : 's'}.`;
}
