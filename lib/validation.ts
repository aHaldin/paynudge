import { z } from 'zod';

export const clientSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  companyName: z.string().optional(),
  notes: z.string().optional()
});

export const invoiceSchema = z.object({
  clientId: z.string().uuid('Client is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  amount: z.coerce
    .number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount looks too large'),
  issueDate: z.string().min(1, 'Issue date required'),
  dueDate: z.string().min(1, 'Due date required'),
  status: z.enum(['draft', 'sent', 'paid', 'void']).default('sent')
});

export const reminderRuleSchema = z.object({
  daysOffset: z.coerce
    .number()
    .int('Days offset must be a whole number')
    .min(-60, 'Too far in the past')
    .max(60, 'Too far in the future'),
  tone: z.enum(['friendly', 'neutral', 'firm']),
  enabled: z.coerce.boolean().default(true)
});

export const reminderTemplateSchema = z.object({
  tone: z.enum(['friendly', 'neutral', 'firm']),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required')
});

export const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Full name required')
});

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional()
);

const optionalEmail = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().email('Valid email required').optional()
);


export const accountSettingsSchema = z.object({
  senderName: optionalString,
  replyToEmail: optionalEmail,
  emailSignature: optionalString
});
