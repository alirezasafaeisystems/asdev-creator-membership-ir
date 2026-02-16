import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AsDev Creator Membership',
  description: 'Local-first creator membership platform for Iran.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}

