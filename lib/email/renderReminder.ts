import { renderEmailTemplate } from '@/lib/email/templates';

export type SenderProfile = {
  senderName?: string | null;
  replyToEmail?: string | null;
  emailSignature?: string | null;
  fullName?: string | null;
};

export type RenderReminderInput = {
  templateSubject: string;
  templateBody: string;
  tone: 'friendly' | 'neutral' | 'firm';
  daysOffset: number;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  issueDate: string;
  businessName?: string | null;
  senderProfile?: SenderProfile | null;
};

export function renderReminderContent(input: RenderReminderInput) {
  const profile = input.senderProfile ?? {};
  const businessName = input.businessName ?? 'PayNudge';
  const senderName =
    profile.senderName?.trim() || profile.fullName?.trim() || businessName;
  const replyToEmail = profile.replyToEmail?.trim() || '';
  const signatureText =
    profile.emailSignature?.trim() || `-- ${senderName}`;

  const rendered = renderEmailTemplate(
    { subject: input.templateSubject, body: input.templateBody },
    {
      tone: input.tone,
      daysOffset: input.daysOffset,
      clientName: input.clientName,
      invoiceNumber: input.invoiceNumber,
      amount: input.amount,
      dueDate: input.dueDate,
      issueDate: input.issueDate,
      businessName,
      senderName,
      replyToEmail,
      emailSignature: signatureText
    }
  );

  const baseText = rendered.body.trim();
  const text = `${baseText}\n\n${signatureText}`;
  const html = `${toHtml(baseText)}<br/><br/>${toHtml(signatureText)}`;

  return {
    subject: rendered.subject,
    text,
    html,
    replyToEmail: replyToEmail || null
  };
}

function toHtml(value: string) {
  return escapeHtml(value).replace(/\n/g, '<br/>');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
