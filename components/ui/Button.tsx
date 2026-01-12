import { ButtonHTMLAttributes } from 'react';

import clsx from 'clsx';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition',
        variant === 'primary'
          ? 'bg-accent text-white hover:bg-blue-700'
          : 'bg-white text-ink ring-1 ring-slate-200 hover:bg-slate-50',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    />
  );
}
