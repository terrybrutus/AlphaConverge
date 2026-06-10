import type { Stock } from "@/types/stock";
import { Link } from "@tanstack/react-router";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

interface StockCardProps {
  stock: Stock;
  index: number;
}

export function StockCard({ stock, index }: StockCardProps) {
  const isPositive = stock.changePercent >= 0;
  const chartData = stock.priceHistory.map((price, i) => ({ i, price }));
  const strokeColor = isPositive
    ? "oklch(var(--chart-4))"
    : "oklch(var(--destructive))";

  return (
    <Link
      to="/stock/$symbol"
      params={{ symbol: stock.symbol }}
      data-ocid={`stocks.item.${index}`}
      className="block group"
    >
      <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <span className="font-mono font-bold text-base text-foreground">
              {stock.symbol}
            </span>
            <p className="text-xs text-muted-foreground truncate max-w-[120px]">
              {stock.name}
            </p>
          </div>
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold font-mono ${
              isPositive
                ? "bg-chart-4/15 text-chart-4"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {isPositive ? "+" : ""}
            {stock.changePercent.toFixed(2)}%
          </div>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="font-mono text-xl font-bold text-foreground">
              ${stock.price.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Vol: {(Number(stock.volume) / 1_000_000).toFixed(1)}M
            </p>
          </div>
          <div className="w-20 h-10 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Link>
  );
}
