import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Manrope } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SpoilerProvider } from "@/contexts/SpoilerContext";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Set metadataBase for all pages (canonical URLs, OG images, etc.)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tankd.io'

// Metadata is now handled by individual pages (especially homepage in page.tsx)
// Keeping robots directive and metadataBase at layout level
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${manrope.variable} ${barlowCondensed.variable} antialiased`}>
        <SpoilerProvider>
          <Header />
          {children}
          <Footer />
          <MobileBottomNav />
        </SpoilerProvider>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-8G8CLL4K3F"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-8G8CLL4K3F');
          `}
        </Script>
      </body>
    </html>
  );
}
