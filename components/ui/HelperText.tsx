import { ReactNode } from 'react';

type HelperTextProps = {
  children: ReactNode;
  tone?: 'muted' | 'error';
};

export function HelperText({ children, tone = 'muted' }: HelperTextProps) {
  return (
    <p
      className={
        tone === 'error' ? 'text-xs text-red-500' : 'text-xs text-slate-500'
      }
    >
      {children}
    </p>
  );
}
