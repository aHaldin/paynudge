import { Resend } from 'resend';

import { defaultEmailTemplates } from '@/lib/email/templates';
import { ReminderTone } from '@/lib/reminders/templates';
import { renderReminderContent, SenderProfile } from '@/lib/email/renderReminder';

export type EmailInput = {
  tone: ReminderTone;
  daysOffset: number;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  issueDate: string;
  clientName: string;
  clientEmail: string;
  paymentLink?: string | null;
  businessName?: string | null;
  subjectTemplate?: string | null;
  bodyTemplate?: string | null;
  senderProfile?: SenderProfile | null;
};

const fromAddress = process.env.RESEND_FROM ?? 'PayNudge billing@YOURDOMAIN';

export async function sendReminderEmail(input: EmailInput) {
  const fallbackTemplate = defaultEmailTemplates[input.tone];
  const subjectTemplate = input.subjectTemplate ?? fallbackTemplate.subject;
  const bodyTemplate = input.bodyTemplate ?? fallbackTemplate.body;

  const rendered = renderReminderContent({
    templateSubject: subjectTemplate,
    templateBody: bodyTemplate,
    tone: input.tone,
    daysOffset: input.daysOffset,
    clientName: input.clientName,
    invoiceNumber: input.invoiceNumber,
    amount: input.amount,
    dueDate: input.dueDate,
    issueDate: input.issueDate,
    businessName: input.businessName ?? null,
    senderProfile: input.senderProfile ?? null
  });

  const resend = new Resend(process.env.RESEND_API_KEY ?? '');
  const response = await resend.emails.send({
    from: fromAddress,
    to: input.clientEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    reply_to: rendered.replyToEmail ?? undefined
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return {
    subject: rendered.subject,
    body: rendered.text,
    providerId: response.data?.id ?? null
  };
}
