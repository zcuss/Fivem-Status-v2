"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ── Role hierarchy (descending) ──────────────────────────────────────────
const ROLE_HIERARCHY: Record<string, number> = {
  bot: 7,
  admin: 6,
  dev: 5,
  premium: 4,
  donator: 3,
  custom: 2,
  user: 1,
};

interface SidebarItem {
  label: string;
  icon: string;
  href: string;
  /** Minimum role required to see this item. Defaults to "user" (visible to all). */
  minRole?: string;
}

// ── Navigation items ──────────────────────────────────────────────────────
const workspaceItems: SidebarItem[] = [
  { label: "Dashboard", icon: "fa-solid fa-gauge", href: "dashboard", minRole: "user" },
  { label: "Logs", icon: "fa-solid fa-file-lines", href: "logs", minRole: "user" },
  { label: "Commands", icon: "fa-solid fa-terminal", href: "commands", minRole: "user" },
  { label: "Settings", icon: "fa-solid fa-gear", href: "settings", minRole: "admin" },
  { label: "Auto Find", icon: "fa-solid fa-magnifying-glass", href: "autofind", minRole: "user" },
  { label: "Steam Ranks", icon: "fa-solid fa-ranking-star", href: "ranks", minRole: "user" },
  { label: "Tasks", icon: "fa-solid fa-list-check", href: "tasks", minRole: "user" },
  { label: "Analytics", icon: "fa-solid fa-chart-line", href: "analytics", minRole: "user" },
  { label: "Server Listing", icon: "fa-solid fa-server", href: "servers-list", minRole: "admin" },
  { label: "Audit", icon: "fa-solid fa-clipboard-check", href: "audit", minRole: "admin" },
  { label: "Feature Center", icon: "fa-solid fa-puzzle-piece", href: "feature-center", minRole: "user" },
];

const devItems: SidebarItem[] = [
  { label: "Dev Settings", icon: "fa-solid fa-code", href: "dev-settings", minRole: "dev" },
];

function hasRequiredRole(userRole: string, minRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? 1;
  const minLevel = ROLE_HIERARCHY[minRole] ?? 1;
  return userLevel >= minLevel;
}

export default function ServerLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const guildId = (params?.guildId as string) ?? "";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("user");

  const base = `/dashboard/server/${guildId}`;

  // Fetch current user's role for sidebar visibility
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.ok && data.data?.role) {
          setUserRole(data.data.role);
        }
      })
      .catch(() => {});
  }, []);

  const visibleWorkspace = workspaceItems.filter((item) =>
    hasRequiredRole(userRole, item.minRole ?? "user")
  );
  const visibleDev = devItems.filter((item) =>
    hasRequiredRole(userRole, item.minRole ?? "user")
  );

  const renderLink = (item: SidebarItem) => {
    const fullHref = `${base}/${item.href}`;
    const isDashboard = item.href === "dashboard";
    const href = isDashboard ? base : fullHref;
    const isActive = isDashboard
      ? pathname === base || pathname === `${base}/`
      : (pathname ?? "").startsWith(fullHref);

    return (
      <Link
        key={item.href}
        href={href}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
        onClick={() => setSidebarOpen(false)}
      >
        <i className={cn(item.icon, "w-4 text-center text-xs")} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-16 left-3 z-50 rounded-md border border-border bg-background p-2 text-muted-foreground hover:text-foreground"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <i className={sidebarOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"} />
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "w-64 shrink-0 border-r border-border bg-card flex flex-col z-40 transition-transform duration-200",
          "fixed lg:sticky top-[3.5rem] h-[calc(100vh-3.5rem)]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4 border-b border-border">
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
            onClick={() => setSidebarOpen(false)}
          >
            <i className="fa-solid fa-arrow-left" /> All Servers
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pt-1 pb-1.5 font-semibold">
            Workspace
          </div>
          {visibleWorkspace.map(renderLink)}

          {visibleDev.length > 0 && (
            <>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pt-3 pb-1.5 font-semibold">
                Developer
              </div>
              {visibleDev.map(renderLink)}
            </>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 p-4 lg:p-6">{children}</div>
    </div>
  );
}
