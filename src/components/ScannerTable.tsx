import { useState, useEffect } from 'react';
import { Stock } from '@/types';
import { formatPrice, formatPercent, formatVolume, formatMarketCap } from '@/lib/market';
import { TrendingUp, TrendingDown, News } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScannerTableProps {
  stocks: Stock[];
  onStockSelect: (symbol: string) => void;
}

type SortField = 'symbol' | 'changePercent' | 'price' | 'volume' | 'float' | 'marketCap';
type SortDirection = 'asc' | 'desc';

export function ScannerTable({ stocks, onStockSelect }: ScannerTableProps) {
  const [sortField, setSortField] = useState<SortField>('changePercent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [flashingCells, setFlashingCells] = useState<Record<string, 'up' | 'down'>>({});

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedStocks = [...stocks].sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    switch (sortField) {
      case 'symbol':
        aVal = a.symbol;
        bVal = b.symbol;
        break;
      case 'changePercent':
        aVal = a.changePercent;
        bVal = b.changePercent;
        break;
      case 'price':
        aVal = a.price;
        bVal = b.price;
        break;
      case 'volume':
        aVal = a.volume;
        bVal = b.volume;
        break;
      case 'float':
        aVal = a.float;
        bVal = b.float;
        break;
      case 'marketCap':
        aVal = a.marketCap;
        bVal = b.marketCap;
        break;
      default:
        aVal = a.symbol;
        bVal = b.symbol;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc' 
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  // Track price changes for flash effect
  useEffect(() => {
    const newFlashing: Record<string, 'up' | 'down'> = {};
    
    stocks.forEach(stock => {
      if (stock.change > 0) {
        newFlashing[stock.symbol] = 'up';
      } else if (stock.change < 0) {
        newFlashing[stock.symbol] = 'down';
      }
    });

    setFlashingCells(newFlashing);
    
    // Clear flash effect after animation
    const timer = setTimeout(() => {
      setFlashingCells({});
    }, 500);

    return () => clearTimeout(timer);
  }, [stocks]);

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th 
      className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? <TrendingUp size={12} /> : <TrendingDown size={12} />
        )}
      </div>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-border">
          <tr>
            <SortableHeader field="symbol">Ticker</SortableHeader>
            <SortableHeader field="changePercent">Chg%</SortableHeader>
            <SortableHeader field="price">Last Price</SortableHeader>
            <SortableHeader field="volume">Volume</SortableHeader>
            <SortableHeader field="float">Float</SortableHeader>
            <SortableHeader field="marketCap">Market Cap</SortableHeader>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              News
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sortedStocks.map((stock) => (
            <tr 
              key={stock.symbol}
              className="hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onStockSelect(stock.symbol)}
            >
              <td className="px-3 py-3">
                <div>
                  <div className="font-mono font-semibold text-foreground">
                    {stock.symbol}
                  </div>
                  <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {stock.name}
                  </div>
                </div>
              </td>
              <td className={cn(
                "px-3 py-3 font-mono font-semibold transition-colors duration-200",
                stock.changePercent >= 0 ? "text-success" : "text-destructive",
                flashingCells[stock.symbol] === 'up' && "price-flash-up",
                flashingCells[stock.symbol] === 'down' && "price-flash-down"
              )}>
                {formatPercent(stock.changePercent)}
              </td>
              <td className={cn(
                "px-3 py-3 font-mono transition-colors duration-200",
                flashingCells[stock.symbol] === 'up' && "price-flash-up",
                flashingCells[stock.symbol] === 'down' && "price-flash-down"
              )}>
                {formatPrice(stock.price)}
              </td>
              <td className="px-3 py-3 font-mono text-muted-foreground">
                {formatVolume(stock.volume)}
              </td>
              <td className="px-3 py-3 font-mono text-muted-foreground">
                {formatVolume(stock.float)}
              </td>
              <td className="px-3 py-3 font-mono text-muted-foreground">
                {formatMarketCap(stock.marketCap)}
              </td>
              <td className="px-3 py-3">
                {stock.news > 0 ? (
                  <div className="flex items-center gap-1">
                    <News size={16} className="text-accent" />
                    <span className="text-xs font-medium text-accent">
                      {stock.news}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}