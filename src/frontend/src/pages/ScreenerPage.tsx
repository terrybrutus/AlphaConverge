import { LivePanel } from "@/components/LivePanel";
import { Database, Layers, Radar } from "lucide-react";
import { motion } from "motion/react";

export function ScreenerPage() {
  return (
    <div className="min-h-screen bg-background" data-ocid="screener.page">
      {/* Hero */}
      <div className="relative overflow-hidden bg-card border-b border-border">
        <img
          src="/assets/generated/stock-hero.dim_1200x400.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-15"
        />
        <div className="relative z-10 px-4 md:px-8 py-10 md:py-14 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-primary text-sm font-mono font-semibold uppercase tracking-widest mb-2">
              Signal Convergence Engine
            </p>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-3">
              The Screener
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
              Four independent evidence families are scored per ticker. Macro is
              context and lifecycle stage describes timing. A setup surfaces
              only when technical structure plus two sufficiently covered
              non-price company families align.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-wrap gap-4 mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2 border border-border">
              <Radar className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Strict evidence rules
              </span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2 border border-border">
              <Layers className="w-4 h-4 text-chart-4" />
              <span className="text-sm text-muted-foreground">
                Candidates remain clearly labeled
              </span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2 border border-border">
              <Database className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">
                Missing data never becomes a positive signal
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-6">
        <LivePanel />
      </div>
    </div>
  );
}
