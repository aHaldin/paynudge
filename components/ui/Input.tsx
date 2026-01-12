import { forwardRef, InputHTMLAttributes } from 'react';
import clsx from 'clsx';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        'w-full rounded-md border px-3 py-2 text-sm outline-none transition',
        hasError
          ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
          : 'border-slate-200 focus:border-ink focus:ring-2 focus:ring-slate-100',
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';
