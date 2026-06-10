import { PortfolioCard } from "@/components/PortfolioCard";
import { SearchInput } from "@/components/SearchInput";
import { StockCard } from "@/components/StockCard";
import { MOCK_PORTFOLIO, MOCK_STOCKS } from "@/data/mockStocks";
import { useIsMobile } from "@/hooks/use-mobile";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

export function DashboardPage() {
  const [query, setQuery] = useState("");
  const isMobile = useIsMobile();

  const filtered = useMemo(() => {
    if (!query) return MOCK_STOCKS;
    const q = query.toLowerCase();
    return MOCK_STOCKS.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
    );
  }, [query]);

  const gainers = MOCK_STOCKS.filter((s) => s.changePercent > 0).length;
  const losers = MOCK_STOCKS.filter((s) => s.changePercent < 0).length;

  return (
    <div className="min-h-screen bg-background" data-ocid="dashboard.page">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-card border-b border-border">
        <img
          src="/assets/generated/stock-hero.dim_1200x400.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="relative z-10 px-4 md:px-8 py-10 md:py-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-primary text-sm font-mono font-semibold uppercase tracking-widest mb-2">
              Live Market Overview
            </p>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-3">
              Your Dashboard
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl">
              Track the markets with real-time mock data. Explore stocks,
              monitor trends, and stay ahead.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-wrap gap-4 mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2 border border-border">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {MOCK_STOCKS.length} Stocks Tracked
              </span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2 border border-border">
              <TrendingUp className="w-4 h-4 text-chart-4" />
              <span className="text-sm text-muted-foreground">
                {gainers} Gaining
              </span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2 border border-border">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <span className="text-sm text-muted-foreground">
                {losers} Declining
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">
        <div
          className={`grid gap-6 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}
        >
          {/* Stocks Column */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Market Watch
              </h2>
              <SearchInput value={query} onChange={setQuery} />
            </div>

            {filtered.length === 0 ? (
              <div
                className="text-center py-16 text-muted-foreground"
                data-ocid="stocks.empty_state"
              >
                <p className="text-lg font-medium">
                  No stocks match your search
                </p>
                <p className="text-sm mt-1">
                  Try a different symbol or company name
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((stock, i) => (
                  <motion.div
                    key={stock.symbol}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <StockCard stock={stock} index={i + 1} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Portfolio Sidebar */}
          <div className="col-span-1">
            <PortfolioCard portfolio={MOCK_PORTFOLIO} stocks={MOCK_STOCKS} />
          </div>
        </div>
      </div>
    </div>
  );
}
