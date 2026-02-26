import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NewsMarker — Bookmark & Read",
  description: "Aggregate news from top sources, bookmark your favorites, and read them later.",
  keywords: ["news", "bookmarks", "RSS", "reader", "BBC", "CNN", "TechCrunch"],
  verification: {
    google: "1AJWkiMPtVJGrJqfJDpaX8L90py1EwNoQFOliYinzGQ",
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
      </body>
    </html>
  );
}
