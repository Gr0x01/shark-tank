import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SpoilerProvider } from "@/contexts/SpoilerContext";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Metadata is now handled by individual pages (especially homepage in page.tsx)
// Keeping robots directive at layout level
export const metadata: Metadata = {
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@200;300;500;700;800&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300&display=swap"
          rel="stylesheet"
        />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-8G8CLL4K3F"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-8G8CLL4K3F');
            `,
          }}
        />
        {/* Privacy-friendly analytics by Plausible */}
        <script defer data-domain="tankd.io" src="https://plausible.io/js/script.js"></script>
      </head>
      <body className="antialiased">
        <SpoilerProvider>
          <Header />
          {children}
          <Footer />
        </SpoilerProvider>
      </body>
    </html>
  );
}
