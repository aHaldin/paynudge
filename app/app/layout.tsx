import { signOut } from '@/app/login/actions';
import { AppNavbar } from '@/components/AppNavbar';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user?.id ?? '')
    .single();

  return (
    <div className="min-h-screen bg-mist">
      <AppNavbar
        userLabel={profile?.full_name ?? user?.email ?? 'Account'}
        signOutAction={signOut}
      />
      <main className="mx-auto max-w-6xl px-6 pt-6 pb-10">{children}</main>
    </div>
  );
}
