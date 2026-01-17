import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Genesis Gates",
  description: "The Future of Digital Assets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      {/* Use dark text by default to complement the light surface */}
      <body className="min-h-screen bg-surface text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}