import { forwardRef, SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  hasError?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError, ...props }, ref) => (
    <select
      ref={ref}
      className={clsx(
        'w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition',
        hasError
          ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
          : 'border-slate-200 focus:border-ink focus:ring-2 focus:ring-slate-100',
        className
      )}
      {...props}
    />
  )
);

Select.displayName = 'Select';
