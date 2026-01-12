import clsx from 'clsx';

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <span className={clsx('text-lg font-semibold', className)}>
      <span className="text-ink">Pay</span>
      <span className="text-accent">Nudge</span>
    </span>
  );
}
