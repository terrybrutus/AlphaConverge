import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Stock {
    low: number;
    high: number;
    name: string;
    open: number;
    priceHistory: Array<number>;
    volume: bigint;
    price: number;
    changePercent: number;
    symbol: string;
}
export interface PortfolioHolding {
    avgCost: number;
    quantity: number;
    symbol: string;
}
export interface PortfolioSummary {
    totalValue: number;
    holdings: Array<PortfolioHolding>;
    totalGainLoss: number;
}
export interface backendInterface {
    getPortfolio(): Promise<PortfolioSummary>;
    getStock(symbol: string): Promise<Stock | null>;
    getStocks(): Promise<Array<Stock>>;
}
