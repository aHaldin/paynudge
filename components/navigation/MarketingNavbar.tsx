'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/Logo';

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="transition hover:opacity-80">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-slate-600 hover:text-ink">
            Login
          </Link>
          <Link href="/login?mode=signup">
            <Button>Start free — 14 days</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
