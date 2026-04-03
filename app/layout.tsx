import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mamie SEO — Analyseur SEO pour freelances",
  description:
    "Analysez le SEO de votre site en 2 minutes. Audit technique automatisé + analyse éditoriale par IA, pensé pour les indépendants.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#F8F8F7] text-[#1A1A18]" style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
