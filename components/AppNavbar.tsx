'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Logo } from '@/components/Logo';

type AppNavbarProps = {
  userLabel: string;
  signOutAction: () => Promise<void>;
};

const navItems = [
  { label: 'Dashboard', href: '/app' },
  { label: 'Clients', href: '/app/clients' },
  { label: 'Invoices', href: '/app/invoices' },
  { label: 'Reminder rules', href: '/app/settings/reminders' }
];

export function AppNavbar({ userLabel, signOutAction }: AppNavbarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );
  const menuWidth = 176;
  const menuZIndex = 10000;

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!isOpen) return;
      if (
        menuRef.current?.contains(event.target as Node) ||
        triggerRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        left: rect.right - menuWidth
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, menuWidth]);

  return (
    <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/app"
          className="text-lg font-semibold transition"
        >
          <Logo />
        </Link>
        <nav className="hidden items-center gap-3 text-sm text-slate-600 md:flex">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/app' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'rounded-full px-3 py-1.5 transition',
                  isActive
                    ? 'bg-slate-100 text-ink'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-ink'
                ].join(' ')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="relative">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-haspopup="menu"
            ref={triggerRef}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <span className="max-w-[180px] truncate text-ink">{userLabel}</span>
            <span className="text-xs text-slate-400">v</span>
          </button>
          {isOpen && menuPos
            ? createPortal(
                <div
                  className="fixed inset-0"
                  style={{ zIndex: menuZIndex, pointerEvents: 'none' }}
                >
                  <div
                    className="fixed w-44 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-lg"
                    style={{
                      top: menuPos.top,
                      left: menuPos.left,
                      pointerEvents: 'auto'
                    }}
                    role="menu"
                    ref={menuRef}
                  >
                    <Link
                      href="/app/account"
                      className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50"
                      role="menuitem"
                      onClick={() => setIsOpen(false)}
                    >
                      Sender details
                    </Link>
                    <Link
                      href="/app/billing"
                      className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50"
                      role="menuitem"
                      onClick={() => setIsOpen(false)}
                    >
                      Billing
                    </Link>
                    <form
                      action={signOutAction}
                      onSubmit={() => setIsOpen(false)}
                    >
                      <button
                        type="submit"
                        className="w-full rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                        role="menuitem"
                      >
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>,
                document.body
              )
            : null}
        </div>
      </div>
    </header>
  );
}
