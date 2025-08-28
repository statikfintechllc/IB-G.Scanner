import { useState } from 'react';
import { Plus, Search } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Stock } from '@/types';
import { cn } from '@/lib/utils';

interface TabSelectorProps {
  stocks: Stock[];
  onStockSelect: (symbol: string) => void;
  openTabSymbols: string[];
}

export function TabSelector({ stocks, onStockSelect, openTabSymbols }: TabSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter stocks that aren't already open and match search
  const availableStocks = stocks.filter(stock => 
    !openTabSymbols.includes(stock.symbol) &&
    (stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
     stock.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleStockSelect = (symbol: string) => {
    onStockSelect(symbol);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="px-3 py-2 border-l border-border rounded-none hover:bg-muted/50 flex-shrink-0"
          title="Add new chart tab"
        >
          <Plus size={16} />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl w-[700px]">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-sm">Add Chart Tab</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search stocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stock List */}
          <ScrollArea className="h-48">
            <div className="space-y-1 pr-2">
              {availableStocks.length > 0 ? (
                availableStocks.slice(0, 50).map((stock) => (
                  <div
                    key={stock.symbol}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors",
                      "hover:bg-muted/50 border border-transparent hover:border-border"
                    )}
                    onClick={() => handleStockSelect(stock.symbol)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{stock.symbol}</span>
                        <Badge 
                          variant={stock.changePercent >= 0 ? "default" : "destructive"}
                          className={cn(
                            "text-xs",
                            stock.changePercent >= 0 ? "bg-success text-success-foreground" : ""
                          )}
                        >
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {stock.name}
                      </div>
                    </div>
                    
                    <div className="text-right text-sm">
                      <div className="font-medium">${stock.price.toFixed(4)}</div>
                      <div className="text-xs text-muted-foreground">
                        {(stock.volume / 1000000).toFixed(1)}M vol
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  {searchQuery ? 'No stocks found matching your search' : 'All stocks already have open tabs'}
                </div>
              )}
            </div>
          </ScrollArea>

          {availableStocks.length > 50 && (
            <div className="text-xs text-muted-foreground text-center">
              Showing first 50 results. Use search to narrow down.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}