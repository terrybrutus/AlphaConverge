import type { PortfolioSummary, Stock } from "@/types/stock";

function genHistory(base: number, length = 30): number[] {
  const history: number[] = [base];
  for (let i = 1; i < length; i++) {
    const prev = history[i - 1];
    const delta = (Math.random() - 0.48) * prev * 0.03;
    history.push(Math.round((prev + delta) * 100) / 100);
  }
  return history;
}

export const MOCK_STOCKS: Stock[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 187.42,
    changePercent: 1.34,
    open: 184.9,
    high: 188.2,
    low: 183.6,
    volume: BigInt(62_300_000),
    priceHistory: genHistory(187.42),
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    price: 875.6,
    changePercent: 3.21,
    open: 847.0,
    high: 882.5,
    low: 843.1,
    volume: BigInt(38_900_000),
    priceHistory: genHistory(875.6),
  },
  {
    symbol: "TSLA",
    name: "Tesla, Inc.",
    price: 248.73,
    changePercent: -1.87,
    open: 253.4,
    high: 255.0,
    low: 245.8,
    volume: BigInt(44_100_000),
    priceHistory: genHistory(248.73),
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    price: 415.2,
    changePercent: 0.92,
    open: 411.8,
    high: 417.3,
    low: 410.5,
    volume: BigInt(21_200_000),
    priceHistory: genHistory(415.2),
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 182.9,
    changePercent: -0.44,
    open: 184.1,
    high: 185.2,
    low: 181.7,
    volume: BigInt(29_700_000),
    priceHistory: genHistory(182.9),
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 171.35,
    changePercent: 2.06,
    open: 167.8,
    high: 172.0,
    low: 167.4,
    volume: BigInt(17_500_000),
    priceHistory: genHistory(171.35),
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc.",
    price: 489.0,
    changePercent: 1.55,
    open: 481.2,
    high: 491.4,
    low: 479.8,
    volume: BigInt(15_300_000),
    priceHistory: genHistory(489.0),
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase",
    price: 198.44,
    changePercent: -0.71,
    open: 199.8,
    high: 200.5,
    low: 197.2,
    volume: BigInt(11_800_000),
    priceHistory: genHistory(198.44),
  },
];

export const MOCK_PORTFOLIO: PortfolioSummary = {
  totalValue: 48_320.85,
  totalGainLoss: 3_741.2,
  holdings: [
    { symbol: "AAPL", quantity: 50, avgCost: 162.3 },
    { symbol: "NVDA", quantity: 10, avgCost: 620.0 },
    { symbol: "MSFT", quantity: 25, avgCost: 380.5 },
    { symbol: "GOOGL", quantity: 30, avgCost: 148.7 },
  ],
};
