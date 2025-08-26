import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChartTimeframe, TechnicalIndicator } from '@/types';
import { formatPrice, formatPercent } from '@/lib/market';
import { TrendingUp, TrendingDown } from '@phosphor-icons/react';

interface StockChartProps {
  symbol: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
}

const TIMEFRAMES: ChartTimeframe[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1h' },
  { value: '1d', label: '1d' }
];

const INDICATORS: TechnicalIndicator[] = [
  { id: 'ema9', name: 'EMA 9', enabled: false },
  { id: 'ema20', name: 'EMA 20', enabled: true },
  { id: 'ema50', name: 'EMA 50', enabled: false },
  { id: 'rsi', name: 'RSI 14', enabled: false },
  { id: 'macd', name: 'MACD', enabled: false }
];

export function StockChart({ symbol, currentPrice = 1.23, change = 0.15, changePercent = 13.89 }: StockChartProps) {
  const [timeframe, setTimeframe] = useState<string>('5m');
  const [indicators, setIndicators] = useState(INDICATORS);

  const toggleIndicator = (id: string) => {
    setIndicators(prev => prev.map(indicator => 
      indicator.id === id ? { ...indicator, enabled: !indicator.enabled } : indicator
    ));
  };

  const isPositive = change >= 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold font-mono">{symbol}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xl font-mono">{formatPrice(currentPrice)}</span>
              <div className={`flex items-center gap-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
                {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="font-mono">{formatPrice(change)}</span>
                <span className="font-mono">({formatPercent(changePercent)})</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe Selector */}
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((tf) => (
                <SelectItem key={tf.value} value={tf.value}>
                  {tf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Indicators */}
          <div className="flex items-center gap-1">
            {indicators.map((indicator) => (
              <Badge
                key={indicator.id}
                variant={indicator.enabled ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleIndicator(indicator.id)}
              >
                {indicator.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 p-4">
        <Card className="h-full flex items-center justify-center bg-muted/20">
          <div className="text-center text-muted-foreground">
            <div className="mb-2">📈</div>
            <div className="text-sm">
              {symbol} Chart - {timeframe} timeframe
            </div>
            <div className="text-xs mt-1">
              TradingView integration would be implemented here
            </div>
            <div className="text-xs mt-2">
              Active indicators: {indicators.filter(i => i.enabled).map(i => i.name).join(', ') || 'None'}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}