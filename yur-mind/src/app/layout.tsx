import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YUR: Void-Full Framework',
  description: 'A World Computer prototype simulating the Void-Full Framework (VFF).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}