import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_STOCKS } from "@/data/mockStocks";
import { useParams } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart2,
  TrendingDown,
  TrendingUp,
  Volume2,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-lg font-mono font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function StockDetailPage() {
  const { symbol } = useParams({ from: "/stock/$symbol" });
  const stock = useMemo(
    () => MOCK_STOCKS.find((s) => s.symbol === symbol?.toUpperCase()),
    [symbol],
  );

  if (!stock) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-muted-foreground">
          Stock <span className="text-foreground font-mono">{symbol}</span> not
          found
        </p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const isPositive = stock.changePercent >= 0;
  const chartData = stock.priceHistory.map((price, i) => ({
    point: i + 1,
    price,
  }));
  const chartColor = isPositive
    ? "oklch(var(--chart-4))"
    : "oklch(var(--destructive))";

  return (
    <div className="min-h-screen bg-background" data-ocid="stock-detail.page">
      <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto">
        {/* Back */}
        <Link to="/" data-ocid="stock-detail.back_button">
          <Button variant="ghost" className="mb-6 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>

        {/* Header */}
        <motion.div
          className="bg-card border border-border rounded-2xl p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="font-display text-4xl font-bold text-foreground">
                  {stock.symbol}
                </span>
                <Badge variant="outline" className="text-xs font-mono">
                  {isPositive ? "▲" : "▼"} NASDAQ
                </Badge>
              </div>
              <p className="text-muted-foreground text-base">{stock.name}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-4xl font-bold text-foreground">
                ${stock.price.toFixed(2)}
              </p>
              <div
                className={`flex items-center justify-end gap-1 mt-1 ${
                  isPositive ? "text-chart-4" : "text-destructive"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="font-mono text-lg font-semibold">
                  {isPositive ? "+" : ""}
                  {stock.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Chart */}
        <motion.div
          className="bg-card border border-border rounded-2xl p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Price History
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(var(--border))"
              />
              <XAxis
                dataKey="point"
                tick={{ fontSize: 11, fill: "oklch(var(--muted-foreground))" }}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: "oklch(var(--muted-foreground))" }}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(var(--card))",
                  border: "1px solid oklch(var(--border))",
                  borderRadius: "8px",
                  color: "oklch(var(--foreground))",
                }}
                formatter={(v: number) => [`$${v.toFixed(2)}`, "Price"]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <StatCard label="Open" value={`$${stock.open.toFixed(2)}`} />
          <StatCard label="High" value={`$${stock.high.toFixed(2)}`} />
          <StatCard label="Low" value={`$${stock.low.toFixed(2)}`} />
          <StatCard
            label="Volume"
            value={`${(Number(stock.volume) / 1_000_000).toFixed(1)}M`}
          />
        </motion.div>

        {/* Volume Icon */}
        <div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
          <Volume2 className="w-4 h-4" />
          <span>
            Volume: {Number(stock.volume).toLocaleString()} shares traded today
          </span>
        </div>
      </div>
    </div>
  );
}
