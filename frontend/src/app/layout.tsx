import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "LinkedIn",
  description: "A static LinkedIn home-feed recreation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
