"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { label: "Settings", icon: "⚙️", href: "settings" },
  { label: "Commands", icon: "💬", href: "commands" },
  { label: "Auto-Find", icon: "🔍", href: "autofind" },
  { label: "Ranks", icon: "🏆", href: "ranks" },
  { label: "Logs", icon: "📋", href: "logs" },
  { label: "Tasks", icon: "📝", href: "tasks" },
  { label: "Feature Center", icon: "🚀", href: "features" },
  { label: "Dev Settings", icon: "🔧", href: "dev" },
];

export default function ServerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const guildId = params.guildId as string;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] gap-0 -mx-4 -mt-6">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-gray-800 bg-gray-900/50 p-4">
        <Link
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-white transition mb-4 block"
        >
          ← Back to Dashboard
        </Link>
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const fullHref = `/dashboard/server/${guildId}/${item.href}`;
            const isActive = pathname.startsWith(fullHref);
            return (
              <Link
                key={item.href}
                href={fullHref}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
