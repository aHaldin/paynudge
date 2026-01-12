import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PayNudge',
  description: 'Get paid on time without awkward chasing.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-mist text-ink">
        {children}
      </body>
    </html>
  );
}
