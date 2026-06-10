import { AccountControl } from "@/components/AccountControl";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link, useRouterState } from "@tanstack/react-router";
import { Layers, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const routerState = useRouterState();
  const isActive = (path: string) => routerState.location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-card border-b border-border shadow-xs"
        data-ocid="layout.header"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            data-ocid="layout.logo_link"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display text-xl font-bold text-foreground tracking-tight">
              Alpha<span className="text-primary">Converge</span>
            </span>
          </Link>

          {/* Nav + actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {!isMobile && (
              <nav className="flex items-center gap-1">
                <Link to="/" data-ocid="layout.nav_screener">
                  <Button
                    variant={isActive("/") ? "secondary" : "ghost"}
                    size="sm"
                    className="text-sm font-medium"
                  >
                    Screener
                  </Button>
                </Link>
                <Link to="/backtest" data-ocid="layout.nav_backtest">
                  <Button
                    variant={isActive("/backtest") ? "secondary" : "ghost"}
                    size="sm"
                    className="text-sm font-medium"
                  >
                    Backtest
                  </Button>
                </Link>
                <Link to="/how-it-works" data-ocid="layout.nav_methodology">
                  <Button
                    variant={isActive("/how-it-works") ? "secondary" : "ghost"}
                    size="sm"
                    className="text-sm font-medium"
                  >
                    How it works
                  </Button>
                </Link>
              </nav>
            )}

            <Link to="/settings" title="Settings">
              <Button
                variant={isActive("/settings") ? "secondary" : "ghost"}
                size={isMobile ? "icon" : "sm"}
                className="text-sm font-medium"
              >
                <Settings className="w-4 h-4 md:mr-1.5" />
                <span className="hidden md:inline">Settings</span>
              </Button>
            </Link>
            <AccountControl />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              data-ocid="layout.theme_toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-accent" />
              ) : (
                <Moon className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            © {new Date().getFullYear()} AlphaConverge — Preview build, not
            investment advice
          </span>
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors duration-200"
          >
            Built with love using caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
