export type EmailTone = 'friendly' | 'neutral' | 'firm';

export type EmailTemplate = {
  subject: string;
  body: string;
};

export type TemplateRenderData = {
  tone: EmailTone;
  daysOffset: number;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  issueDate: string;
  businessName?: string | null;
  senderName?: string | null;
  replyToEmail?: string | null;
  emailSignature?: string | null;
};

export const defaultEmailTemplates: Record<EmailTone, EmailTemplate> = {
  friendly: {
    subject: 'Friendly reminder — invoice {{invoice_number}} due {{due_date}}',
    body:
      'Hi {{client_name}},\n\nJust a quick reminder that invoice {{invoice_number}} is due on {{due_date}} (issued {{issue_date}}) for {{amount}}.\n\nIf you have already arranged payment, please ignore this.\n\n{{email_signature}}'
  },
  neutral: {
    subject: 'Invoice {{invoice_number}} due today',
    body:
      'Hi {{client_name}},\n\nThis is a reminder that invoice {{invoice_number}} is due today ({{due_date}}) for {{amount}}.\n\nCould you confirm when payment is scheduled?\n\n{{email_signature}}'
  },
  firm: {
    subject: 'Overdue invoice — {{invoice_number}} (due {{due_date}})',
    body:
      'Hi {{client_name}},\n\nInvoice {{invoice_number}} is now overdue (due {{due_date}}, issued {{issue_date}}) for {{amount}}.\n\nPlease arrange payment or let us know the expected payment date.\n\n{{email_signature}}'
  }
};

export function renderEmailTemplate(
  template: EmailTemplate,
  data: TemplateRenderData
): EmailTemplate {
  const businessName = data.businessName || 'PayNudge Billing';
  const senderName = data.senderName || businessName;
  const replyToEmail = data.replyToEmail ?? '';
  const emailSignature = data.emailSignature || `-- ${senderName}`;
  const timing = buildTimingLabel(data.daysOffset);
  const timingLine = buildTimingLine(data.daysOffset);

  const replacements: Record<string, string> = {
    '{{client_name}}': data.clientName,
    '{{invoice_number}}': data.invoiceNumber,
    '{{amount}}': data.amount,
    '{{due_date}}': data.dueDate,
    '{{issue_date}}': data.issueDate,
    '{{your_business_name}}': businessName,
    '{{sender_name}}': senderName,
    '{{reply_to_email}}': replyToEmail,
    '{{email_signature}}': emailSignature,
    '{{signature}}': emailSignature,
    '{{days_offset}}': String(data.daysOffset),
    '{{timing}}': timing,
    '{{timing_line}}': timingLine
  };

  const subject = replaceTokens(template.subject, replacements).trim();
  let body = template.body;

  body = removeLinesForToken(body, '{{email_signature}}');

  body = replaceTokens(body, replacements)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { subject, body };
}

function replaceTokens(input: string, replacements: Record<string, string>) {
  let output = input;
  for (const [token, value] of Object.entries(replacements)) {
    output = output.split(token).join(value);
  }
  return output;
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
    return 'This invoice is due today.';
  }
  if (daysOffset > 0) {
    return `This invoice is ${daysOffset} day${daysOffset === 1 ? '' : 's'} overdue.`;
  }
  return `This invoice is due in ${Math.abs(daysOffset)} day${daysOffset === -1 ? '' : 's'}.`;
}

function removeLinesForToken(body: string, token: string) {
  return body
    .split('\n')
    .filter((line) => !line.includes(token))
    .join('\n');
}
