import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'AsDev Creator Membership',
    template: '%s | AsDev',
  },
  description: 'Local-first creator membership platform for Iran.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'AsDev Creator Membership',
    description: 'Local-first creator membership platform for Iran.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
