import { useState, useEffect } from 'react';
import { TrendingUp, Lightbulb, BarChart3 } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { aiSearchService } from '@/lib/aiSearch';
import { Stock } from '@/types';
import { cn } from '@/lib/utils';

interface MarketInsightsProps {
  stocks: Stock[];
}

export function MarketInsights({ stocks }: MarketInsightsProps) {
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Load insights when dialog opens
  useEffect(() => {
    if (isOpen && insights.length === 0) {
      loadInsights();
    }
  }, [isOpen, stocks]);

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const newInsights = await aiSearchService.getMarketInsights(stocks);
      setInsights(newInsights);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshInsights = () => {
    setInsights([]);
    loadInsights();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <TrendingUp size={16} />
          Market Insights
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-[800px] w-[800px] h-[600px] flex flex-col p-4">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <TrendingUp size={16} />
            Market Insights & Analysis
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-shrink-0 pb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshInsights}
            disabled={isLoading}
            className="text-xs"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
            ) : (
              'Refresh'
            )}
          </Button>
        </div>

        <div className="flex-1 min-h-0">
          <div className="h-full border border-border rounded-lg overflow-hidden bg-card/30">
            <div className="h-full overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Analyzing market data...</p>
                </div>
              ) : insights.length > 0 ? (
                <div className="p-6 space-y-4">
                  {insights.map((insight, index) => (
                    <Card key={index} className="bg-card/50 border-l-4 border-l-accent hover:bg-card/70 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <Lightbulb size={16} className="text-accent" />
                          </div>
                          <div className="text-sm text-foreground leading-relaxed whitespace-normal break-words">
                            {insight}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                  <BarChart3 size={48} className="mx-auto mb-4 opacity-50 text-muted-foreground" />
                  <p className="text-base mb-2 text-muted-foreground">No insights available</p>
                  <p className="text-sm text-muted-foreground mb-4">Market analysis will appear here</p>
                  <Button variant="outline" onClick={refreshInsights} disabled={isLoading}>
                    Generate Insights
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}