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
      
      <DialogContent className="max-w-[95vw] w-[3200px] h-[90vh] flex flex-col p-10">
        <DialogHeader className="flex-shrink-0 pb-8">
          <DialogTitle className="flex items-center gap-4 text-3xl">
            <Brain size={36} />
            AI-Powered Stock Search & Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-10 min-h-0">
          {/* Search Input */}
          <div className="flex gap-8 flex-shrink-0">
            <div className="relative flex-1">
              <Search size={22} className="absolute left-6 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search for breakout patterns, high volume stocks, sector trends, momentum plays..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-16 h-18 text-xl"
              />
            </div>
            <Button 
              onClick={() => handleSearch()} 
              disabled={isSearching || !searchQuery.trim()}
              className="flex-shrink-0 px-16 h-18 text-xl"
            >
              {isSearching ? (
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-foreground" />
              ) : (
                'Search'
              )}
            </Button>
          </div>

          {/* Main Content Area - Three Column Layout */}
          <div className="flex-1 flex gap-12 min-h-0">
            {/* Left Column - Search Results */}
            <div className="w-2/5 flex flex-col min-h-0">
              <div className="flex-shrink-0 mb-8">
                <h3 className="text-2xl font-semibold flex items-center gap-4">
                  <Target size={28} />
                  Search Results {searchResults.length > 0 && `(${searchResults.length})`}
                </h3>
              </div>
              
              <div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-card/50">
                <div className="h-full overflow-y-auto custom-scrollbar">
                  {searchResults.length > 0 ? (
                    <div className="p-8 space-y-6">
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
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex flex-col gap-3">
                                <h4 className="font-mono font-bold text-2xl">{result.symbol}</h4>
                                <Badge variant="outline" className="text-base w-fit">
                                  Relevance: {result.relevanceScore}%
                                </Badge>
                              </div>
                              {result.priceTargets && (
                                <div className="text-right text-base text-muted-foreground space-y-2">
                                  <div>Target: ${result.priceTargets.target}</div>
                                  <div>Support: ${result.priceTargets.support}</div>
                                </div>
                              )}
                            </div>

                            {/* Reasons */}
                            <div className="mb-4">
                              <div className="flex flex-wrap gap-3">
                                {result.reasons.slice(0, 3).map((reason, i) => (
                                  <Badge key={i} variant="secondary" className="text-base py-2 px-4">
                                    {reason}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {/* Patterns */}
                            {result.patterns.length > 0 && (
                              <div className="space-y-3">
                                {result.patterns.slice(0, 2).map((pattern, i) => (
                                  <div key={i} className="flex items-center justify-between text-base">
                                    <span className="text-muted-foreground">{pattern.pattern}</span>
                                    <Badge 
                                      className={cn(
                                        "text-base py-1 px-3",
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
                    <div className="p-16 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
                      <Brain size={80} className="mx-auto mb-8 opacity-50" />
                      <p className="text-2xl mb-4">No search results yet</p>
                      <p className="text-lg">Try searching for patterns, sectors, or conditions</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section - Recent Searches, Quick Suggestions, and Market Insights */}
            <div className="w-3/5 flex gap-8 min-h-0">
              {/* Recent Searches Column */}
              <div className="w-1/3 flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-8">
                  <h3 className="text-2xl font-semibold flex items-center gap-4">
                    <History size={28} />
                    Recent Searches
                  </h3>
                </div>
                
                <div className="flex-1 border border-border rounded-xl overflow-hidden bg-card/50">
                  <div className="h-full overflow-y-auto custom-scrollbar p-6">
                    <div className="space-y-4">
                      {searchHistory.slice(0, 10).map((search, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-base h-auto py-4 px-4 rounded-lg"
                          onClick={() => handleSuggestionClick(search.query)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-left leading-relaxed truncate">{search.query}</span>
                            <Badge variant="outline" className="ml-3 text-sm flex-shrink-0">
                              {search.results.length}
                            </Badge>
                          </div>
                        </Button>
                      ))}
                      {searchHistory.length === 0 && (
                        <div className="text-center text-muted-foreground py-16">
                          <p className="text-lg mb-3">No recent searches</p>
                          <p className="text-sm">Your search history will appear here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Suggestions Column */}
              <div className="w-1/3 flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-8">
                  <h3 className="text-2xl font-semibold flex items-center gap-4">
                    <Lightbulb size={28} />
                    Quick Suggestions
                  </h3>
                </div>
                <div className="flex-1 border border-border rounded-xl overflow-hidden bg-card/50">
                  <div className="h-full overflow-y-auto custom-scrollbar p-6">
                    <div className="space-y-4">
                      {suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-base h-auto py-4 px-4 text-left rounded-lg"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <span className="leading-relaxed whitespace-normal">{suggestion}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Market Insights Column */}
              <div className="w-1/3 flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-8">
                  <h3 className="text-2xl font-semibold flex items-center gap-4">
                    <TrendingUp size={28} />
                    Market Insights
                  </h3>
                </div>
                <div className="flex-1 border border-border rounded-xl overflow-hidden bg-card/50">
                  <div className="h-full overflow-y-auto custom-scrollbar p-6">
                    <div className="space-y-4">
                      {insights.map((insight, index) => (
                        <div key={index} className="text-base text-muted-foreground p-4 bg-muted/20 rounded-lg leading-relaxed whitespace-normal">
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