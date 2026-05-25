import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { Home as HomeIcon, Gamepad2, Play, Trophy, LayoutGrid } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const bottomNav = [
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/live", label: "Live", icon: Gamepad2 },
    { href: "/stream/1", label: "Stream", icon: Play },
    { href: "/highlights", label: "Highlights", icon: Trophy },
    { href: "/admin", label: "More", icon: LayoutGrid },
  ];

  const topNav = [
    { href: "/", label: "Home" },
    { href: "/live", label: "Live" },
    { href: "/highlights", label: "Highlights" },
    { href: "/admin", label: "Admin" },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 w-full bg-card border-b border-border">
        <div className="max-w-lg mx-auto md:max-w-7xl flex h-12 items-center justify-between px-4">
          <Link href="/">
            <span className="font-black text-xl tracking-tight cursor-pointer" style={{ color: "#FF6200", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
              FootballLive
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {topNav.map((item) => (
              <Link key={item.href} href={item.href}>
                <span className={cn(
                  "text-sm font-medium transition-colors hover:text-primary cursor-pointer",
                  location === item.href ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-6">
        <div className="max-w-lg mx-auto md:max-w-7xl px-0 md:px-4 md:py-6">
          {children}
        </div>
      </main>

      {/* Bottom Mobile Nav — MatchFoari style */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-card border-t border-border px-2 pt-2 pb-5">
        {bottomNav.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href) && item.href !== "/";
          const active = item.href === "/" ? location === "/" : isActive;
          return (
            <Link key={item.href} href={item.href}>
              <span className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-14 cursor-pointer",
                active ? "text-primary" : "text-muted-foreground"
              )}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[9px] font-medium mt-0.5">{item.label}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
