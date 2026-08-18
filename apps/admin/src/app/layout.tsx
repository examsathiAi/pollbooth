import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'pollbooth.it Admin',
  description: 'Administration dashboard for PollBooth moderation and community operations',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f4efe7] text-[#1f1b18] antialiased">{children}</body>
    </html>
  );
}
