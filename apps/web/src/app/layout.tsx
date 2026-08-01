import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse - India's Opinion Platform",
  description: "Vote, share opinions, and see what India thinks. The front page of public opinion.",
  openGraph: {
    title: "Pulse - India's Opinion Platform",
    description: "Vote, share opinions, and see what India thinks.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
