import * as React from "react";
import { Link, useLocation } from "wouter";
import {
  Moon, Sun, LayoutDashboard, Package, Wrench, FileText, ArrowRightLeft,
  Users, Settings, Building2, ShoppingCart, BarChart2, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const isDark =
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      setTheme("light");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
      setTheme("light");
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-sidebar-foreground">
      {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  children?: { href: string; label: string; icon: React.ElementType }[];
};

const navGroups: { group: string; items: NavItem[] }[] = [
  {
    group: "Utama",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "Inventaris",
    items: [
      { href: "/materials", label: "Materials", icon: Package },
      { href: "/tools", label: "Tools", icon: Wrench },
      { href: "/stock-movements", label: "Stock Movements", icon: ArrowRightLeft },
    ],
  },
  {
    group: "Pengadaan",
    items: [
      { href: "/suppliers", label: "Suppliers", icon: Building2 },
      { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
    ],
  },
  {
    group: "Permintaan",
    items: [
      { href: "/material-requests", label: "Material Requests", icon: FileText },
      { href: "/tool-requests", label: "Tool Requests", icon: FileText },
    ],
  },
  {
    group: "Laporan",
    items: [
      { href: "/reports", label: "Laporan & Analitik", icon: BarChart2 },
    ],
  },
  {
    group: "Sistem",
    items: [
      { href: "/users", label: "Users", icon: Users },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function NavLink({ href, label, icon: Icon, location }: { href: string; label: string; icon: React.ElementType; location: string }) {
  const active = location === href || (href !== "/" && location.startsWith(href));
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex w-full flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <aside className="w-full md:w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <span className="font-bold text-lg text-sidebar-primary tracking-tight">WarehouseOS</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {navGroups.map(({ group, items }) => (
            <div key={group} className="mb-1">
              <div className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 select-none">
                {group}
              </div>
              <ul className="space-y-0.5 px-3">
                {items.map(item => (
                  <li key={item.href}>
                    <NavLink href={item.href} label={item.label} icon={item.icon} location={location} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3 flex items-center justify-between">
          <span className="text-xs text-sidebar-foreground/40">v1.0.0</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card">
          <div className="font-bold text-base md:hidden">WarehouseOS</div>
          <div className="hidden md:block font-semibold text-sm text-muted-foreground">
            {navGroups.flatMap(g => g.items).find(i => i.href === location || (i.href !== "/" && location.startsWith(i.href)))?.label ?? ""}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="md:hidden"><ThemeToggle /></div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
