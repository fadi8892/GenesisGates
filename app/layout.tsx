import "./globals.css";

export const metadata = {
  title: "GenesisGates",
  description: "Gateway to your origins — privacy-first"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
