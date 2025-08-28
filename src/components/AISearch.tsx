import { useState, useEffect, useRef } from 'react';
import { Search, Brain, TrendingUp, Target, Lightbulb, History, ChevronDown } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { aiSearchService } from '@/lib/aiSearch';
import { Stock, AISearchResult, SearchMemory } from '@/types';
import { useKV } from '@github/spark/hooks';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AISearchProps {
  stocks: Stock[];
  onStockSelect: (symbol: string) => void;
}

export function AISearch({ stocks, onStockSelect }: AISearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AISearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useKV<SearchMemory[]>('ai-search-history', []);
  const [isOpen, setIsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Load suggestions and insights on mount
  useEffect(() => {
    loadSuggestions();
    loadInsights();
  }, [stocks]);

  const loadSuggestions = async () => {
    try {
      const newSuggestions = await aiSearchService.getSearchSuggestions(stocks);
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const loadInsights = async () => {
    try {
      const newInsights = await aiSearchService.getMarketInsights(stocks);
      setInsights(newInsights);
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  };

  const handleSearch = async (query?: string) => {
    const searchTerm = query || searchQuery.trim();
    if (!searchTerm) return;

    setIsSearching(true);
    try {
      const results = await aiSearchService.performSearch(searchTerm, stocks);
      setSearchResults(results);
      
      // Add to history
      setSearchHistory(prev => {
        const newHistory = [{
          query: searchTerm,
          results,
          timestamp: new Date(),
          filters: {} as any
        }, ...prev.slice(0, 19)]; // Keep last 20 searches
        return newHistory;
      });

      toast.success(`Found ${results.length} relevant stocks`);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleStockClick = (symbol: string) => {
    onStockSelect(symbol);
    setIsOpen(false);
    toast.success(`Opened chart for ${symbol}`);
  };

  const getPatternBadgeColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-success';
    if (confidence >= 60) return 'bg-accent';
    return 'bg-muted';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Brain size={16} />
          AI Search
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-[98vw] w-[8000px] h-[90vh] flex flex-col p-10">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Brain size={20} />
            AI Stock Search
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-6 min-h-0">
          {/* Search Input with History Dropdown */}
          <div className="flex gap-4 flex-shrink-0">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search for breakout patterns, high volume stocks, sector trends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 h-9 text-sm w-full"
              />
              
              {/* Recent Searches Dropdown */}
              <Popover open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <ChevronDown size={14} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-2" align="end">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground px-2 py-1 font-medium">Recent Searches</div>
                    {searchHistory.slice(0, 8).map((search, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-sm h-8 px-2"
                        onClick={() => {
                          handleSuggestionClick(search.query);
                          setIsHistoryOpen(false);
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-left truncate">{search.query}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {search.results.length}
                          </Badge>
                        </div>
                      </Button>
                    ))}
                    {searchHistory.length === 0 && (
                      <div className="text-center text-muted-foreground py-4 text-xs">
                        No recent searches
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <Button 
              onClick={() => handleSearch()} 
              disabled={isSearching || !searchQuery.trim()}
              className="flex-shrink-0 px-6 h-9 text-sm"
            >
              {isSearching ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
              ) : (
                'Search'
              )}
            </Button>
          </div>

          {/* Main Content Area - Two Column Layout */}
          <div className="flex-1 flex gap-8 min-h-0">
            {/* Left Column - Search Results (Bigger) */}
            <div className="w-3/5 flex flex-col min-h-0">
              <div className="flex-shrink-0 mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Target size={18} />
                  Search Results {searchResults.length > 0 && `(${searchResults.length})`}
                </h3>
              </div>
              
              <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden bg-card/50">
                <div className="h-full overflow-y-auto custom-scrollbar">
                  {searchResults.length > 0 ? (
                    <div className="p-4 space-y-4">
                      {searchResults.map((result, index) => (
                        <Card 
                          key={result.symbol}
                          className={cn(
                            "cursor-pointer transition-all hover:bg-muted/50 border-l-4",
                            result.relevanceScore >= 80 ? "border-l-success" :
                            result.relevanceScore >= 60 ? "border-l-accent" : "border-l-muted"
                          )}
                          onClick={() => handleStockClick(result.symbol)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex flex-col gap-2">
                                <h4 className="font-mono font-bold text-lg">{result.symbol}</h4>
                                <Badge variant="outline" className="text-sm w-fit">
                                  Relevance: {result.relevanceScore}%
                                </Badge>
                              </div>
                              {result.priceTargets && (
                                <div className="text-right text-sm text-muted-foreground space-y-1">
                                  <div>Target: ${result.priceTargets.target}</div>
                                  <div>Support: ${result.priceTargets.support}</div>
                                </div>
                              )}
                            </div>

                            {/* Reasons */}
                            <div className="mb-3">
                              <div className="flex flex-wrap gap-2">
                                {result.reasons.slice(0, 3).map((reason, i) => (
                                  <Badge key={i} variant="secondary" className="text-sm py-1 px-2">
                                    {reason}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {/* Patterns */}
                            {result.patterns.length > 0 && (
                              <div className="space-y-2">
                                {result.patterns.slice(0, 2).map((pattern, i) => (
                                  <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{pattern.pattern}</span>
                                    <Badge 
                                      className={cn(
                                        "text-sm py-1 px-2",
                                        getPatternBadgeColor(pattern.confidence)
                                      )}
                                    >
                                      {pattern.confidence}%
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
                      <Brain size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">No search results yet</p>
                      <p className="text-sm">Try searching for patterns, sectors, or conditions</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section - Quick Suggestions and Market Insights (Side by Side) */}
            <div className="w-2/5 flex flex-col gap-6 min-h-0">
              {/* Quick Suggestions */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Lightbulb size={18} />
                    Quick Suggestions
                  </h3>
                </div>
                <div className="flex-1 border border-border rounded-lg overflow-hidden bg-card/50">
                  <div className="h-full overflow-y-auto custom-scrollbar p-4">
                    <div className="space-y-2">
                      {suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sm h-auto py-2 px-3 text-left rounded-md"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <span className="leading-normal whitespace-normal">{suggestion}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Market Insights */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp size={18} />
                    Market Insights
                  </h3>
                </div>
                <div className="flex-1 border border-border rounded-lg overflow-hidden bg-card/50">
                  <div className="h-full overflow-y-auto custom-scrollbar p-4">
                    <div className="space-y-3">
                      {insights.map((insight, index) => (
                        <div key={index} className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-md leading-normal whitespace-normal">
                          {insight}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}