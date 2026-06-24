import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PathIn | Explainable career exploration",
    template: "%s",
  },
  description:
    "PathIn turns enabled professional evidence into explainable career directions and practical routes.",
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
