import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenPrem — Open Intelligence Interconnect",
  description:
    "Live demo of the Open Intelligence Interconnect Model — peer-to-peer enterprise architecture replacing brittle middleware.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
