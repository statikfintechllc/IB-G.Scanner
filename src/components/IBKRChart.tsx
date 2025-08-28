import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { ChartData, TechnicalIndicator, ChartTimeframe } from '@/types';
import { ibkrService } from '@/lib/ibkr';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Volume2, Target, Wifi, WifiOff } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface IBKRChartProps {
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
  { id: 'ema20', name: 'EMA 20', enabled: false },
  { id: 'ema50', name: 'EMA 50', enabled: false },
  { id: 'rsi', name: 'RSI (14)', enabled: false },
  { id: 'macd', name: 'MACD', enabled: false },
  { id: 'volume', name: 'Volume', enabled: true }
];

export function IBKRChart({ symbol, currentPrice, change, changePercent }: IBKRChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  
  const [timeframe, setTimeframe] = useState<ChartTimeframe['value']>('5m');
  const [indicators, setIndicators] = useState<TechnicalIndicator[]>(INDICATORS);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [ibkrConnection, setIbkrConnection] = useState(ibkrService.getConnection());
  const [realTimePrice, setRealTimePrice] = useState<number | null>(null);

  // Monitor IBKR connection status
  useEffect(() => {
    const checkConnection = () => {
      setIbkrConnection(ibkrService.getConnection());
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time data when IBKR is connected
  useEffect(() => {
    if (!symbol || !ibkrConnection.connected) return;

    const handleRealTimeData = (data: any) => {
      if (data.lastPrice) {
        setRealTimePrice(data.lastPrice);
        // Update chart with new tick if available
        updateRealtimeTick(data);
      }
    };

    ibkrService.subscribeToMarketData(symbol, handleRealTimeData);

    return () => {
      ibkrService.unsubscribeFromMarketData(symbol);
    };
  }, [symbol, ibkrConnection.connected]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#F0F6FC',
          fontSize: 12,
          fontFamily: 'Inter, sans-serif'
        },
        grid: {
          vertLines: { color: '#374151', style: 0, visible: true },
          horzLines: { color: '#374151', style: 0, visible: true }
        },
        crosshair: {
          mode: 1,
          vertLine: {
            width: 1,
            color: '#3B82F6',
            style: 2
          },
          horzLine: {
            width: 1,
            color: '#3B82F6',
            style: 2
          }
        },
        rightPriceScale: {
          borderColor: '#374151',
          textColor: '#8B949E'
        },
        timeScale: {
          borderColor: '#374151',
          textColor: '#8B949E',
          timeVisible: true,
          secondsVisible: false
        },
        height: 400,
        width: chartContainerRef.current.clientWidth
      });

      // Create candlestick series
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#059669',
        downColor: '#DC2626',
        borderUpColor: '#059669',
        borderDownColor: '#DC2626',
        wickUpColor: '#059669',
        wickDownColor: '#DC2626'
      });

      // Create volume series
      const volumeSeries = chart.addHistogramSeries({
        color: '#374151',
        priceFormat: {
          type: 'volume'
        },
        priceScaleId: 'volume'
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0
        }
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;
      volumeSeriesRef.current = volumeSeries;

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chart) {
          chart.remove();
        }
      };
    } catch (error) {
      console.error('Failed to initialize chart:', error);
      setIsLoading(false);
    }
  }, []);

  // Load historical data from IBKR
  useEffect(() => {
    if (!symbol) return;

    setIsLoading(true);
    
    try {
      // Convert timeframe to IBKR format
      const duration = getDurationForTimeframe(timeframe);
      const barSize = getBarSizeForTimeframe(timeframe);
      
      ibkrService.requestHistoricalData(
        symbol,
        '', // Current time
        duration,
        barSize,
        (data: ChartData[]) => {
          if (data && data.length > 0) {
            setChartData(data);
            updateChart(data);
          } else {
            console.warn('No chart data received for', symbol);
          }
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Failed to load historical data:', error);
      setIsLoading(false);
    }
  }, [symbol, timeframe]);

  // Update chart with historical data
  const updateChart = (data: ChartData[]) => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !data.length) return;

    try {
      // Convert data for chart format
      const candlestickData: CandlestickData[] = data.map(bar => ({
        time: bar.time as Time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close
      }));

      const volumeData = data.map(bar => ({
        time: bar.time as Time,
        value: bar.volume,
        color: bar.close >= bar.open ? '#059669' : '#DC2626'
      }));

      candlestickSeriesRef.current.setData(candlestickData);
      volumeSeriesRef.current.setData(volumeData);

      // Add technical indicators
      updateIndicators(data);
    } catch (error) {
      console.error('Failed to update chart data:', error);
    }
  };

  // Update real-time price tick
  const updateRealtimeTick = (tickData: any) => {
    if (!candlestickSeriesRef.current || !chartData.length) return;

    try {
      const lastBar = chartData[chartData.length - 1];
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Update last bar or create new one based on timeframe
      const updatedBar = {
        time: getBarTime(currentTime, timeframe) as Time,
        open: lastBar.close,
        high: Math.max(lastBar.high, tickData.lastPrice),
        low: Math.min(lastBar.low, tickData.lastPrice),
        close: tickData.lastPrice
      };

      candlestickSeriesRef.current.update(updatedBar);
    } catch (error) {
      console.error('Failed to update real-time tick:', error);
    }
  };

  // Get duration string for IBKR request
  const getDurationForTimeframe = (tf: string): string => {
    switch (tf) {
      case '1m':
      case '5m':
        return '1 D';
      case '15m':
      case '30m':
        return '2 D';
      case '1h':
        return '1 W';
      case '1d':
        return '1 M';
      default:
        return '1 D';
    }
  };

  // Get bar size string for IBKR request
  const getBarSizeForTimeframe = (tf: string): string => {
    switch (tf) {
      case '1m':
        return '1 min';
      case '5m':
        return '5 mins';
      case '15m':
        return '15 mins';
      case '30m':
        return '30 mins';
      case '1h':
        return '1 hour';
      case '1d':
        return '1 day';
      default:
        return '5 mins';
    }
  };

  // Get bar time for real-time updates
  const getBarTime = (timestamp: number, tf: string): number => {
    const minutes = Math.floor(timestamp / 60);
    
    switch (tf) {
      case '1m':
        return minutes * 60;
      case '5m':
        return Math.floor(minutes / 5) * 5 * 60;
      case '15m':
        return Math.floor(minutes / 15) * 15 * 60;
      case '30m':
        return Math.floor(minutes / 30) * 30 * 60;
      case '1h':
        return Math.floor(minutes / 60) * 60 * 60;
      case '1d':
        return Math.floor(timestamp / 86400) * 86400;
      default:
        return minutes * 60;
    }
  };

  // Update technical indicators (simplified)
  const updateIndicators = (data: ChartData[]) => {
    if (!chartRef.current || !data.length) return;

    try {
      // Clear existing indicators
      indicatorSeriesRef.current.forEach(series => {
        try {
          chartRef.current!.removeSeries(series);
        } catch (error) {
          console.warn('Failed to remove indicator series:', error);
        }
      });
      indicatorSeriesRef.current.clear();

      indicators.filter(ind => ind.enabled).forEach(indicator => {
        try {
          switch (indicator.id) {
            case 'ema9':
              addEMA(data, 9, '#F59E0B');
              break;
            case 'ema20':
              addEMA(data, 20, '#3B82F6');
              break;
            case 'ema50':
              addEMA(data, 50, '#8B5CF6');
              break;
          }
        } catch (error) {
          console.warn(`Failed to add ${indicator.id} indicator:`, error);
        }
      });
    } catch (error) {
      console.error('Failed to update indicators:', error);
    }
  };

  // Add EMA indicator
  const addEMA = (data: ChartData[], period: number, color: string) => {
    if (!chartRef.current || data.length < period) return;

    try {
      const emaData = calculateEMA(data, period);
      const emaSeries = chartRef.current.addLineSeries({
        color,
        lineWidth: 1,
        title: `EMA ${period}`
      });

      emaSeries.setData(emaData);
      indicatorSeriesRef.current.set(`ema${period}`, emaSeries);
    } catch (error) {
      console.error(`Failed to add EMA ${period}:`, error);
    }
  };

  // Calculate EMA
  const calculateEMA = (data: ChartData[], period: number) => {
    if (data.length < period) return [];
    
    const ema = [];
    const multiplier = 2 / (period + 1);
    let emaValue = data[0].close;

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        emaValue = data[i].close;
      } else {
        emaValue = (data[i].close * multiplier) + (emaValue * (1 - multiplier));
      }
      
      ema.push({
        time: data[i].time as Time,
        value: Number(emaValue.toFixed(4))
      });
    }

    return ema;
  };

  // Toggle indicator
  const toggleIndicator = (indicatorId: string) => {
    setIndicators(prev => prev.map(ind => 
      ind.id === indicatorId ? { ...ind, enabled: !ind.enabled } : ind
    ));
  };

  const displayPrice = realTimePrice || currentPrice;

  return (
    <div className="h-full flex flex-col">
      {/* Chart Header */}
      <Card className="m-6 mb-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-2xl font-mono flex items-center gap-2">
                {symbol}
                {ibkrConnection.connected ? (
                  <Wifi size={16} className="text-success" />
                ) : (
                  <WifiOff size={16} className="text-destructive" />
                )}
              </CardTitle>
              {displayPrice && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">${displayPrice.toFixed(4)}</span>
                  {change !== undefined && changePercent !== undefined && (
                    <Badge 
                      variant={change >= 0 ? "default" : "destructive"}
                      className={cn(
                        "flex items-center gap-1",
                        change >= 0 ? "bg-success text-success-foreground" : ""
                      )}
                    >
                      {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {change >= 0 ? '+' : ''}{change.toFixed(4)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={timeframe} onValueChange={setTimeframe as any}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map(tf => (
                    <SelectItem key={tf.value} value={tf.value}>
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {indicators.map(indicator => (
              <Button
                key={indicator.id}
                variant={indicator.enabled ? "default" : "outline"}
                size="sm"
                onClick={() => toggleIndicator(indicator.id)}
                className="text-xs"
              >
                {indicator.id === 'volume' && <Volume2 size={14} className="mr-1" />}
                {indicator.id === 'rsi' && <Target size={14} className="mr-1" />}
                {indicator.name}
              </Button>
            ))}
          </div>

          {/* IBKR Connection Status */}
          {!ibkrConnection.connected && (
            <Alert>
              <WifiOff size={16} />
              <AlertDescription>
                IBKR not connected. Using mock data. Check IBKR settings to connect to live data.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
      </Card>

      {/* Chart Container */}
      <CardContent className="flex-1 m-6 mt-0 p-6 pt-0">
        <div className="relative h-full">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/50 backdrop-blur-sm z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Loading {ibkrConnection.connected ? 'IBKR' : 'mock'} chart data...
                </p>
              </div>
            </div>
          )}
          <div ref={chartContainerRef} className="w-full h-full" />
        </div>
      </CardContent>
    </div>
  );
}