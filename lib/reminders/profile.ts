import { SenderProfile } from '@/lib/email/renderReminder';

export async function getSenderProfile(
  supabase: { from: (table: string) => any },
  userId: string
): Promise<SenderProfile | null> {
  if (!userId) return null;

  const { data } = await supabase
    .from('profiles')
    .select('sender_name, reply_to_email, email_signature, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (!data) {
    const { data: created } = await supabase
      .from('profiles')
      .upsert({ id: userId }, { onConflict: 'id' })
      .select('sender_name, reply_to_email, email_signature, full_name')
      .single();

    if (!created) return null;

    return {
      senderName: created.sender_name,
      replyToEmail: created.reply_to_email,
      emailSignature: created.email_signature,
      fullName: created.full_name
    };
  }

  return {
    senderName: data.sender_name,
    replyToEmail: data.reply_to_email,
    emailSignature: data.email_signature,
    fullName: data.full_name
  };
}
