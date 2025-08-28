import { TradingViewChart } from './TradingViewChart';

interface StockChartProps {
  symbol: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
}

export function StockChart({ symbol, currentPrice, change, changePercent }: StockChartProps) {
  return (
    <TradingViewChart 
      symbol={symbol}
      currentPrice={currentPrice}
      change={change}
      changePercent={changePercent}
    />
  );
}