import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "../providers/SocketProvider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pulse - India's Opinion Platform",
  description: "Vote, share opinions, and see what India thinks. The front page of public opinion.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: {
    title: "Pulse - India's Opinion Platform",
    description: "Vote, share opinions, and see what India thinks.",
    type: "website",
    images: ["/og-card.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-gray-50 font-sans">
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
