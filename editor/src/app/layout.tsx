import type { Metadata } from "next";
import "./globals.css";
import "@/styles/studio.css";
import "@/styles/page-themes.css";

export const metadata: Metadata = {
  title: "Andean Road Studio",
  description: "Write and publish Andean Road pages.",
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
