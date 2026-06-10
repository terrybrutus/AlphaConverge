export interface Stock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: bigint;
  priceHistory: number[];
}

export interface PortfolioHolding {
  symbol: string;
  quantity: number;
  avgCost: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalGainLoss: number;
  holdings: PortfolioHolding[];
}
