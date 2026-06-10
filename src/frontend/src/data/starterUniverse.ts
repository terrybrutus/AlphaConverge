// A curated set of liquid, widely-followed US tickers spanning large caps,
// turnaround/EV/energy names, fintech, software, semis, and biotech. One-click
// "load & scan" gives discovery without hunting for symbols — the Screener then
// ranks and surfaces whatever converges, exactly like the sample set.
//
// Kept deliberately modest so a scan stays inside free-tier rate limits. This is
// a starting point, not the whole market — full-universe scanning needs paid
// data + a scheduled backend (see DATA.md).
export const STARTER_UNIVERSE: string[] = [
  // Large-cap anchors
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "GOOGL",
  "META",
  "TSLA",
  // EV / clean energy / turnaround
  "PLUG",
  "CHPT",
  "NIO",
  "RIVN",
  "F",
  // Fintech
  "HOOD",
  "SOFI",
  "PYPL",
  // Software
  "PLTR",
  "NET",
  "SNOW",
  "U",
  // Semiconductors
  "AMD",
  "INTC",
  "MU",
  // Biotech / other
  "MRNA",
  "UBER",
];
