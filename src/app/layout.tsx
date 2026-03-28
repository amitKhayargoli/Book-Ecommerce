import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BOOK Premium Book Store",
  description: "A modern, premium book e-commerce experience. Discover stories that stay with you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
