import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ClientsView } from '@/app/app/clients/ClientsView';

export default async function ClientsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user?.id ?? '')
    .order('created_at', { ascending: false });

  return <ClientsView initialClients={clients ?? []} />;
}
