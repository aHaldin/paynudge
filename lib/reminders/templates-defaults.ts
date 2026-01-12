import { ReminderTone } from '@/lib/reminders/templates';

export type ReminderTemplate = {
  tone: ReminderTone;
  subject: string;
  body: string;
};

export const defaultTemplates: ReminderTemplate[] = [
  {
    tone: 'friendly',
    subject: 'Quick reminder: Invoice {{invoice_number}} {{timing}}',
    body:
      'Hi {{client_name}},\n\n{{timing_line}}\n\nInvoice: {{invoice_number}}\nAmount: {{amount}}\nDue date: {{due_date}}\n\nIf you have already arranged payment, please ignore this note.\n\n{{email_signature}}'
  },
  {
    tone: 'neutral',
    subject: 'Invoice reminder: {{invoice_number}} {{timing}}',
    body:
      'Hi {{client_name}},\n\n{{timing_line}}\n\nInvoice: {{invoice_number}}\nAmount: {{amount}}\nDue date: {{due_date}}\n\nPlease let us know if you need any details to complete payment.\n\n{{email_signature}}'
  },
  {
    tone: 'firm',
    subject: 'Reminder: Invoice {{invoice_number}} {{timing}}',
    body:
      'Hi {{client_name}},\n\n{{timing_line}}\n\nInvoice: {{invoice_number}}\nAmount: {{amount}}\nDue date: {{due_date}}\n\nPlease arrange payment at your earliest convenience.\n\n{{email_signature}}'
  }
];
