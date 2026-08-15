import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PollBooth Admin',
  description: 'Administration dashboard for PollBooth moderation and community operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
