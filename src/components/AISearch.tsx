import { useState, useEffect } from 'react';
import { Search, Brain, TrendingUp, Target, Lightbulb, History } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
      
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Brain size={20} />
            AI-Powered Stock Search
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden px-6 pb-6">
          {/* Search Input */}
          <div className="flex gap-2 flex-shrink-0">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search for breakout patterns, high volume stocks, sector trends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={() => handleSearch()} 
              disabled={isSearching || !searchQuery.trim()}
              className="flex-shrink-0"
            >
              {isSearching ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              ) : (
                'Search'
              )}
            </Button>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
            {/* Search Results */}
            <div className="lg:col-span-2 flex flex-col min-h-0">
              <div className="flex-shrink-0 mb-4">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Target size={18} />
                  Search Results {searchResults.length > 0 && `(${searchResults.length})`}
                </h3>
              </div>
              
              <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden bg-card/30">
                <div className="h-full overflow-y-auto custom-scrollbar">
                  {searchResults.length > 0 ? (
                    <div className="p-6 space-y-4">
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
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex flex-col gap-2">
                                <h4 className="font-mono font-bold text-xl">{result.symbol}</h4>
                                <Badge variant="outline" className="text-sm w-fit">
                                  Relevance: {result.relevanceScore}%
                                </Badge>
                              </div>
                              {result.priceTargets && (
                                <div className="text-right text-sm text-muted-foreground">
                                  <div>Target: ${result.priceTargets.target}</div>
                                  <div>Support: ${result.priceTargets.support}</div>
                                </div>
                              )}
                            </div>

                            {/* Reasons */}
                            <div className="mb-4">
                              <div className="flex flex-wrap gap-2">
                                {result.reasons.slice(0, 3).map((reason, i) => (
                                  <Badge key={i} variant="secondary" className="text-sm">
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
                                        "text-sm",
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
                    <div className="p-8 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
                      <Brain size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No search results yet</p>
                      <p className="text-sm">Try searching for patterns, sectors, or conditions</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4 flex flex-col min-h-0">
              {/* Search Suggestions */}
              <Card className="flex-shrink-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb size={18} />
                    Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="h-40 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                      {suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sm h-auto py-3 px-3"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Market Insights */}
              <Card className="flex-1 min-h-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp size={18} />
                    Market Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex flex-col min-h-0">
                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    <div className="space-y-3">
                      {insights.map((insight, index) => (
                        <div key={index} className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-md">
                          {insight}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Search History */}
              <Card className="flex-shrink-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History size={18} />
                    Recent Searches
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="h-32 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                      {searchHistory.slice(0, 5).map((search, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sm h-auto py-2 px-3"
                          onClick={() => handleSuggestionClick(search.query)}
                        >
                          <div className="truncate">
                            {search.query}
                            <span className="text-muted-foreground ml-1">
                              ({search.results.length})
                            </span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}