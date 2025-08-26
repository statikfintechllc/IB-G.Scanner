export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  float: number;
  news: number;
  lastUpdate: Date;
}

export interface MarketHours {
  status: 'premarket' | 'regular' | 'afterhours' | 'closed';
  label: string;
  isOpen: boolean;
}

export interface ScannerFilters {
  priceMin: number;
  priceMax: number;
  marketCapMin: number;
  marketCapMax: number;
  floatMin: number;
  floatMax: number;
  volumeMin: number;
  changeMin: number;
  changeMax: number;
  newsOnly: boolean;
}

export interface ChartTimeframe {
  value: '1m' | '5m' | '15m' | '30m' | '1h' | '1d';
  label: string;
}

export interface TechnicalIndicator {
  id: string;
  name: string;
  enabled: boolean;
  params?: Record<string, number>;
}