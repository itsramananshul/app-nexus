import type { Metadata } from "next";
import "./globals.css";
import { Sidebar, SIDEBAR_WIDTH_PX } from "@/components/Sidebar";

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
      <body className="min-h-screen antialiased">
        <Sidebar />
        <div style={{ marginLeft: SIDEBAR_WIDTH_PX, minHeight: "100dvh" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
