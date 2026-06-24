import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import type { SessionData } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fivem-Status Dashboard",
  description: "FiveM server management dashboard",
};

async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("fivem_session")?.value;
    if (!raw) return null;

    try {
      const [base64] = raw.split(".");
      if (!base64) return null;
      const json = Buffer.from(base64, "base64url").toString("utf-8");
      const session = JSON.parse(json) as SessionData;
      if (Date.now() - session.iat > 7 * 24 * 60 * 60 * 1000) return null;
      return session;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="font-bold text-lg">
              ⚡ Fivem-Status
            </a>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              {session ? (
                <>
                  <a
                    href="/dashboard/bots"
                    className="hover:text-white transition"
                  >
                    Bots
                  </a>
                  <a
                    href="/dashboard/servers"
                    className="hover:text-white transition"
                  >
                    Servers
                  </a>
                  <a
                    href="/dashboard/logs"
                    className="hover:text-white transition"
                  >
                    Logs
                  </a>
                  <div className="flex items-center gap-2 ml-2">
                    {session.avatar ? (
                      <img
                        src={`https://cdn.discordapp.com/avatars/${session.userId}/${session.avatar}.png?size=32`}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    ) : null}
                    <span className="text-white text-xs">
                      {session.globalName || session.username}
                    </span>
                    {session.role !== "user" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300 uppercase font-medium">
                        {session.role}
                      </span>
                    )}
                    <form action="/api/auth/logout" method="POST">
                      <button
                        type="submit"
                        className="text-xs text-gray-500 hover:text-red-400 transition"
                      >
                        Logout
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <a
                  href="/api/auth/discord"
                  className="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md text-xs font-medium transition"
                >
                  Login with Discord
                </a>
              )}
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
