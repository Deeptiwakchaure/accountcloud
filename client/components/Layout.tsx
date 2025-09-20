import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const nav = [
    { to: "/", label: "Dashboard" },
    { to: "/reports", label: "Reports" },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--muted))]">
      <header className="backdrop-blur bg-white/70 dark:bg-black/40 border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-extrabold tracking-tight text-lg">
            Shiv Accounts Cloud
          </Link>
          <nav className="flex gap-6 text-sm">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "hover:text-primary transition-colors",
                  pathname === n.to ? "text-primary font-semibold" : "text-foreground/70",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
      <footer className="border-t py-6 text-center text-sm text-foreground/60">
        © {new Date().getFullYear()} Shiv Furniture • Real‑time Accounting
      </footer>
    </div>
  );
}
