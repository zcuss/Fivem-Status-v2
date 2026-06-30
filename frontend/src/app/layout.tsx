import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LogoutButton } from "@/components/LogoutButton";
import { getSessionById } from "@/lib/session-store";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fivem-Status Dashboard",
  description: "FiveM server management dashboard",
};

async function getSession() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("fivem_session")?.value;
    if (!sessionId) return null;
    return getSessionById(sessionId);
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4">
            <a
              href="/"
              className="mr-6 flex items-center space-x-2 font-semibold"
            >
              <span className="text-lg">⚡ Fivem-Status</span>
            </a>
            <div className="flex flex-1 items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                {session ? (
                  <>
                    <a
                      href="/dashboard"
                      className="transition-colors hover:text-foreground"
                    >
                      Dashboard
                    </a>
                    <a
                      href="/bots"
                      className="transition-colors hover:text-foreground"
                    >
                      Bots
                    </a>
                    <a
                      href="/servers"
                      className="transition-colors hover:text-foreground"
                    >
                      Servers
                    </a>
                    <a
                      href="/logs"
                      className="transition-colors hover:text-foreground"
                    >
                      Logs
                    </a>
                  </>
                ) : null}
              </div>
              <div className="flex items-center gap-4">
                {session ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {session.avatar ? (
                        <img
                          src={`https://cdn.discordapp.com/avatars/${session.userId}/${session.avatar}.png?size=32`}
                          alt=""
                          className="h-6 w-6 rounded-full"
                        />
                      ) : null}
                      <span className="text-sm font-medium">
                        {session.globalName || session.username}
                      </span>
                      {session.role !== "user" && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary">
                          {session.role}
                        </span>
                      )}
                    </div>
                    <LogoutButton />
                  </div>
                ) : (
                  <a
                    href="/api/auth/discord"
                    className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                  >
                    Login with Discord
                  </a>
                )}
              </div>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
