"use client";

export function LogoutButton() {
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
      }}
      className="text-xs text-muted-foreground hover:text-destructive transition"
    >
      Logout
    </button>
  );
}
