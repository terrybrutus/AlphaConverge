import { Separator } from "@/components/ui/separator";
import type { PortfolioSummary, Stock } from "@/types/stock";
import { Link } from "@tanstack/react-router";
import { Briefcase, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";

interface PortfolioCardProps {
  portfolio: PortfolioSummary;
  stocks: Stock[];
}

export function PortfolioCard({ portfolio, stocks }: PortfolioCardProps) {
  const stockMap = useMemo(() => {
    const map: Record<string, Stock> = {};
    for (const s of stocks) map[s.symbol] = s;
    return map;
  }, [stocks]);

  const isPositive = portfolio.totalGainLoss >= 0;
  const gainPct = (
    (portfolio.totalGainLoss /
      (portfolio.totalValue - portfolio.totalGainLoss)) *
    100
  ).toFixed(2);

  return (
    <div
      className="bg-card border border-border rounded-2xl overflow-hidden"
      data-ocid="portfolio.card"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <Briefcase className="w-4 h-4 text-primary" />
        <h2 className="font-display text-base font-semibold text-foreground">
          My Portfolio
        </h2>
      </div>

      {/* Summary */}
      <div className="px-5 py-4 bg-muted/20">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          Total Value
        </p>
        <p className="font-mono text-3xl font-bold text-foreground">
          $
          {portfolio.totalValue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </p>
        <div
          className={`flex items-center gap-1.5 mt-1.5 ${
            isPositive ? "text-chart-4" : "text-destructive"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span className="font-mono text-sm font-semibold">
            {isPositive ? "+" : ""}$
            {Math.abs(portfolio.totalGainLoss).toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </span>
          <span className="text-xs text-muted-foreground">
            ({isPositive ? "+" : ""}
            {gainPct}%)
          </span>
        </div>
      </div>

      <Separator />

      {/* Holdings */}
      <div className="px-5 py-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Holdings
        </p>
        <div className="space-y-3">
          {portfolio.holdings.map((holding, i) => {
            const stock = stockMap[holding.symbol];
            const currentValue = stock ? stock.price * holding.quantity : 0;
            const cost = holding.avgCost * holding.quantity;
            const gainLoss = currentValue - cost;
            const pct = ((gainLoss / cost) * 100).toFixed(2);
            const positive = gainLoss >= 0;

            return (
              <Link
                key={holding.symbol}
                to="/stock/$symbol"
                params={{ symbol: holding.symbol }}
                data-ocid={`portfolio.item.${i + 1}`}
                className="block group"
              >
                <div className="flex items-center justify-between hover:bg-muted/30 -mx-2 px-2 py-1.5 rounded-lg transition-colors duration-150">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {holding.symbol}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {holding.quantity} shares @ ${holding.avgCost.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-sm font-semibold text-foreground">
                      ${currentValue.toFixed(2)}
                    </p>
                    <p
                      className={`text-xs font-mono ${
                        positive ? "text-chart-4" : "text-destructive"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {pct}%
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
