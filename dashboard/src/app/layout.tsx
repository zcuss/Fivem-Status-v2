import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fivem-Status Dashboard",
  description: "FiveM server management dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="font-bold text-lg">⚡ Fivem-Status</a>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="/bots" className="hover:text-white transition">Bots</a>
              <a href="/servers" className="hover:text-white transition">Servers</a>
              <a href="/logs" className="hover:text-white transition">Logs</a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
