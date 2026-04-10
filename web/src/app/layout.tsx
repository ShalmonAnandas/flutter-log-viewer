import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flutter Log Viewer - Advanced Log Analysis Platform",
  description: "Upload, analyze, and share Flutter app logs with rich visualizations, response time analysis, and deep data inspection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
