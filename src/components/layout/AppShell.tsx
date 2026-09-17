import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  UserCog,
  ShieldCheck,
  ScrollText,
  UserRound,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, logAudit, useCurrentUser, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof Users };

const NAV: Record<string, NavItem[]> = {
  admin: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/guru", label: "Data Guru", icon: Users },
    { to: "/supervisor", label: "Supervisor Akademik", icon: UserCog },
    { to: "/pengguna", label: "Pengguna & Peran", icon: ShieldCheck },
    { to: "/audit-log", label: "Log Audit", icon: ScrollText },
    { to: "/profil", label: "Profil Saya", icon: UserRound },
  ],
  kepala_madrasah: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/guru", label: "Data Guru", icon: Users },
    { to: "/supervisor", label: "Supervisor Akademik", icon: UserCog },
    { to: "/audit-log", label: "Log Audit", icon: ScrollText },
    { to: "/profil", label: "Profil Saya", icon: UserRound },
  ],
  supervisor: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/guru", label: "Guru Binaan", icon: Users },
    { to: "/profil", label: "Profil Saya", icon: UserRound },
  ],
  guru: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/supervisor", label: "Supervisor Saya", icon: UserCog },
    { to: "/profil", label: "Profil Saya", icon: UserRound },
  ],
  none: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/profil", label: "Profil Saya", icon: UserRound },
  ],
};

export function navFor(role: AppRole | null): NavItem[] {
  return NAV[role ?? "none"] ?? NAV["none"]!;
}

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { data: user, isLoading } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = navFor(user?.role ?? null);

  async function keluar() {
    await logAudit("logout", { description: "Pengguna keluar dari portal" });
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-primary">
          Portal Supervisi
        </p>
        <p className="mt-1 text-base font-semibold leading-tight">MTs Annur 1</p>
        <p className="text-xs text-sidebar-foreground/70">Malangbong – Garut</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-5 py-4 text-xs text-sidebar-foreground/70">
        Tahun Pelajaran 2026/2027
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-72">{sidebar}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Tutup menu"
            className="absolute inset-0 bg-foreground/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 shadow-elevated">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Buka menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
            {description && (
              <p className="truncate text-xs text-muted-foreground sm:text-sm">{description}</p>
            )}
          </div>
          <div className="hidden text-right sm:block">
            {isLoading ? (
              <Skeleton className="h-9 w-40" />
            ) : (
              <>
                <p className="text-sm font-medium leading-tight">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.role ? ROLE_LABEL[user.role] : "Peran belum ditetapkan"}
                </p>
              </>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={keluar}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
