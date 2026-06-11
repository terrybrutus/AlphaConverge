import { INSTRUMENT_LABEL, STAGE_LABEL } from "@/lib/convergence";
import type { Instrument, Stage } from "@/types/ticker";
import {
  AlertTriangle,
  Building2,
  CandlestickChart,
  Gauge,
  Globe2,
  Layers,
  MessageSquare,
  Waves,
} from "lucide-react";
import { motion } from "motion/react";

const DIMENSIONS = [
  {
    icon: CandlestickChart,
    title: "Technical structure",
    plain:
      "The price-structure family. Technical signals, lifecycle stage, and OBV all come from price/volume, so they count together as one confirmation rather than three independent votes.",
  },
  {
    icon: Building2,
    title: "Fundamental inflection",
    plain:
      "Not 'is the company good' — is something CHANGING. Revenue growth speeding up, analysts raising estimates, the stock cheap versus its own history, insiders buying their own shares, funds adding to positions. The turn matters more than the level.",
  },
  {
    icon: Waves,
    title: "Market microstructure",
    plain:
      "Independent positioning data: unusual call buying, heavy short interest, large off-exchange prints, and put/call shifts. Price-derived OBV belongs to technical structure and never contributes to this confirmation.",
  },
  {
    icon: MessageSquare,
    title: "Sentiment",
    plain:
      "The crowd waking up. A spike in Reddit mentions, news turning positive, and rising search interest. Analyst recommendations stay out because they overlap with fundamental analyst evidence.",
  },
  {
    icon: Globe2,
    title: "Macro & sector",
    plain:
      "The tide. Sector relative strength and the broad market regime matter, but this is context rather than another company-specific confirmation.",
  },
  {
    icon: Layers,
    title: "Lifecycle stage",
    plain:
      "Where in the recovery the stock is. It describes timing and fatigue risk, but does not add another independent convergence vote.",
  },
];

const STAGES: { stage: Stage; meaning: string }[] = [
  {
    stage: "capitulation",
    meaning:
      "The washout low. Extreme fear, volume drying up, divergence forming, no higher high yet. Earliest entry, biggest upside, longest wait. You can be early here.",
  },
  {
    stage: "base",
    meaning:
      "Accumulation. Price grinds sideways in a tight range on quiet volume while strong hands build. The breakout hasn't happened yet.",
  },
  {
    stage: "breakout",
    meaning:
      "Confirmation. First higher high on expanding volume. The move has actually started — lowest risk of being too early.",
  },
  {
    stage: "earlyTrend",
    meaning:
      "The trend is established and rising. Lower risk, but a lot of the easy upside is already gone.",
  },
];

const INSTRUMENTS: { instrument: Instrument; when: string }[] = [
  {
    instrument: "leapCall",
    when: "Capitulation / base — long-dated so time decay isn't fighting you while it bottoms.",
  },
  {
    instrument: "nearTermCall",
    when: "Breakout — the move has started, so a shorter-dated call captures it.",
  },
  {
    instrument: "cashSecuredPut",
    when: "Rich option premium sitting on support — get paid to wait, and own shares lower if assigned.",
  },
  {
    instrument: "dcaStock",
    when: "Established trend — scale into shares instead of paying option premium.",
  },
  {
    instrument: "pass",
    when: "Independent evidence or instrument-specific data is insufficient — watch it, don't commit capital.",
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-2xl font-bold text-foreground mb-4">
      {children}
    </h2>
  );
}

export function MethodologyPage() {
  return (
    <div className="min-h-screen bg-background" data-ocid="methodology.page">
      <div className="px-4 md:px-8 py-10 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-primary text-sm font-mono font-semibold uppercase tracking-widest mb-2">
            How it works
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            The method behind the madness
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Every stock that exploded shared a fingerprint: several independent
            things lined up at the same time. One signal is noise. The edge is{" "}
            <span className="text-foreground font-medium">convergence</span> —
            independent categories all pointing the same way at once.
            AlphaConverge only surfaces a stock when price structure and at
            least{" "}
            <span className="text-foreground font-medium">
              two independent non-price company evidence families
            </span>{" "}
            agree with sufficient data coverage.
          </p>
        </motion.div>

        {/* Dimensions */}
        <div className="mt-10">
          <SectionTitle>Evidence families and context</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DIMENSIONS.map((d) => (
              <div
                key={d.title}
                className="bg-card border border-border rounded-xl p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <d.icon className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-semibold text-foreground">
                    {d.title}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {d.plain}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Stages */}
        <div className="mt-10">
          <SectionTitle>The four stages</SectionTitle>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            The stage answers the question you kept asking: am I too early? Each
            stage maps to a different way to play it.
          </p>
          <div className="space-y-3">
            {STAGES.map((s) => (
              <div
                key={s.stage}
                className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4"
              >
                <span className="font-mono text-sm font-semibold text-primary whitespace-nowrap sm:w-44">
                  {STAGE_LABEL[s.stage]}
                </span>
                <span className="text-sm text-muted-foreground leading-relaxed">
                  {s.meaning}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Instruments */}
        <div className="mt-10">
          <SectionTitle>Matching the instrument to the setup</SectionTitle>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            The same convergence can call for a very different trade depending
            on the stage. AlphaConverge only suggests an options instrument when
            live volatility, liquidity, and spread data are explicitly
            available.
          </p>
          <div className="space-y-3">
            {INSTRUMENTS.map((it) => (
              <div
                key={it.instrument}
                className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4"
              >
                <span className="font-mono text-sm font-semibold text-foreground whitespace-nowrap sm:w-44">
                  {INSTRUMENT_LABEL[it.instrument]}
                </span>
                <span className="text-sm text-muted-foreground leading-relaxed">
                  {it.when}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fatigue */}
        <div className="mt-10">
          <SectionTitle>The fatigue warning</SectionTitle>
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-sm text-accent/90 leading-relaxed">
              The danger of buying a bottom is buying it too soon and grinding
              sideways for a year until you give up — right before it runs. When
              the signals say a setup is structurally early (a capitulation low
              with no higher high yet), the Play card flags it so you can favor
              long-dated exposure or wait for confirmation instead of getting
              chopped up.
            </p>
          </div>
        </div>

        {/* Honesty */}
        <div className="mt-10">
          <SectionTitle>What live data can confirm today</SectionTitle>
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-5 text-sm leading-relaxed text-accent/90">
            <p>
              Live Technical is fully connected. Finnhub currently supplies
              insider buying (18% of Fundamental) and headline sentiment (35% of
              Sentiment). Independent Microstructure has no connected live
              source. Because a family needs at least 50% coverage to align, the
              current free-source wiring cannot produce a strict Surfaced play.
            </p>
            <p className="mt-2">
              The Screener therefore labels technically aligned names as
              Candidates for further research without pretending they have
              independent confirmation. Illustrated complete setups live on the
              Examples page and remain clearly marked Preview.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <SectionTitle>On the numbers you see</SectionTitle>
          <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-3">
            <Gauge className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Screener uses live provider data for connected fields. The
              separate Examples page uses a labeled fictional universe so you
              can see the complete engine work end to end. Missing live fields
              remain unknown and never become positive evidence. This is a
              research tool, not investment advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
