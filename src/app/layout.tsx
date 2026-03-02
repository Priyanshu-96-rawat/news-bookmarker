import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: 'NewsMarker — Bookmark & Read Top News',
  description: 'Curate and bookmark top stories from BBC, CNN & TechCrunch. Powered by AI categorization.',
  keywords: ['news', 'bookmarks', 'BBC', 'CNN', 'TechCrunch', 'AI news'],
  openGraph: {
    title: 'NewsMarker',
    description: 'Bookmark and read curated news stories',
    url: 'https://news-bookmarker.vercel.app',
    siteName: 'NewsMarker',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
