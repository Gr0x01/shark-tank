import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Shark Tank Products | Every Product Ever Pitched",
  description: "The complete directory of Shark Tank products. Find out which products are still in business, where to buy them, and what deals were made.",
  keywords: ["Shark Tank", "Shark Tank products", "where to buy", "still in business", "deals"],
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
