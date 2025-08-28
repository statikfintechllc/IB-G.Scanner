import { useState, useEffect } from 'react';
import { AIRecommendation, Stock, AIMarketScan } from '@/types';
import { aiPatternService } from '@/lib/aiPatterns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Brain,
  TrendingUp,
  TrendingDown,
  Eye,
  Target,
  Shield,
  Clock,
  Activity,
  Zap,
  BarChart3,
  AlertTriangle
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface SFTiTop10Props {
  stocks: Stock[];
  onStockSelect: (symbol: string) => void;
}

export function SFTiTop10({ stocks, onStockSelect }: SFTiTop10Props) {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [marketScan, setMarketScan] = useState<AIMarketScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Generate AI recommendations
  useEffect(() => {
    const generateRecommendations = async () => {
      if (stocks.length === 0) return;
      
      setLoading(true);
      try {
        const [aiRecommendations, scanResult] = await Promise.all([
          aiPatternService.generateAIRecommendations(stocks),
          aiPatternService.performAIMarketScan(stocks)
        ]);
        
        setRecommendations(aiRecommendations);
        setMarketScan(scanResult);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to generate AI recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    generateRecommendations();
    
    // Update every 2 minutes
    const interval = setInterval(generateRecommendations, 120000);
    return () => clearInterval(interval);
  }, [stocks]);

  const getTypeIcon = (type: AIRecommendation['type']) => {
    switch (type) {
      case 'strong_buy':
        return <TrendingUp className="text-green-400" weight="bold" />;
      case 'buy':
        return <TrendingUp className="text-green-500" />;
      case 'watch':
        return <Eye className="text-blue-400" />;
      case 'sell':
        return <TrendingDown className="text-red-500" />;
      default:
        return <Activity className="text-muted-foreground" />;
    }
  };

  const getTypeColor = (type: AIRecommendation['type']) => {
    switch (type) {
      case 'strong_buy':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'buy':
        return 'bg-green-500/15 text-green-500 border-green-500/25';
      case 'watch':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/25';
      case 'sell':
        return 'bg-red-500/15 text-red-500 border-red-500/25';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskColor = (risk: AIRecommendation['risk']) => {
    switch (risk) {
      case 'low':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Brain className="text-primary" size={20} />
            <h2 className="text-lg font-semibold">SFTi Top 10</h2>
            <Badge variant="secondary" className="ml-auto">
              <Zap size={12} className="mr-1" />
              Analyzing...
            </Badge>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin">
              <Brain size={48} className="text-primary mx-auto" />
            </div>
            <p className="text-muted-foreground">AI is analyzing market patterns...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="text-primary" size={20} />
            <h2 className="text-lg font-semibold">SFTi Top 10</h2>
            <Badge variant="secondary">
              <Zap size={12} className="mr-1" />
              {recommendations.length} Recommendations
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Updated {lastUpdate.toLocaleTimeString()}
          </div>
        </div>

        {/* Market Sentiment Overview */}
        {marketScan && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  <span className="text-xs font-medium">Market Sentiment</span>
                </div>
                <div className={cn(
                  "text-sm font-semibold mt-1",
                  marketScan.marketSentiment === 'bullish' && "text-green-400",
                  marketScan.marketSentiment === 'bearish' && "text-red-400",
                  marketScan.marketSentiment === 'neutral' && "text-yellow-400"
                )}>
                  {marketScan.marketSentiment.toUpperCase()}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-primary" />
                  <span className="text-xs font-medium">Unusual Volume</span>
                </div>
                <div className="text-sm font-semibold mt-1">
                  {marketScan.volumeAnalysis.unusualVolume.length} stocks
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-primary" />
                  <span className="text-xs font-medium">Pattern Matches</span>
                </div>
                <div className="text-sm font-semibold mt-1">
                  {marketScan.patternMatches.length} detected
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <Tabs defaultValue="recommendations" className="h-full flex flex-col">
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="recommendations" className="text-xs">
              <TrendingUp size={14} className="mr-1" />
              Recommendations
            </TabsTrigger>
            <TabsTrigger value="patterns" className="text-xs">
              <Activity size={14} className="mr-1" />
              Patterns
            </TabsTrigger>
            <TabsTrigger value="volume" className="text-xs">
              <BarChart3 size={14} className="mr-1" />
              Volume Analysis
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 p-6 pt-4">
            <TabsContent value="recommendations" className="h-full mt-0">
              <div className="h-full overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                  {recommendations.length > 0 ? recommendations.map((rec) => (
                    <Card 
                      key={rec.id} 
                      className="bg-card/50 hover:bg-card/70 transition-colors cursor-pointer"
                      onClick={() => onStockSelect(rec.symbol)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getTypeIcon(rec.type)}
                            <div>
                              <div className="font-semibold text-sm">{rec.symbol}</div>
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs", getTypeColor(rec.type))}
                              >
                                {rec.type.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Confidence</div>
                            <div className="text-sm font-semibold">
                              {(rec.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                          <div>
                            <div className="text-muted-foreground">Target Price</div>
                            <div className="font-semibold text-green-400">
                              ${rec.priceTarget.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Stop Loss</div>
                            <div className="font-semibold text-red-400">
                              ${rec.stopLoss.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Timeframe</div>
                            <div className="font-semibold">{rec.timeframe}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Risk Level</div>
                            <div className={cn("font-semibold", getRiskColor(rec.risk))}>
                              {rec.risk.toUpperCase()}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">AI Score:</span>
                            <Progress value={rec.aiScore} className="flex-1 h-2" />
                            <span className="text-xs font-medium">{rec.aiScore.toFixed(0)}</span>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            <div className="font-medium mb-1">Key Signals:</div>
                            <ul className="space-y-0.5">
                              {rec.reasoning.slice(0, 3).map((reason, idx) => (
                                <li key={idx} className="flex items-center gap-1">
                                  <div className="w-1 h-1 bg-primary rounded-full" />
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                      <Brain size={48} className="mb-4 opacity-50" />
                      <p>No AI recommendations available</p>
                      <p className="text-sm">Add stocks to get AI-powered insights</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="patterns" className="h-full mt-0">
              <div className="h-full overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                  {marketScan?.patternMatches && marketScan.patternMatches.length > 0 ? marketScan.patternMatches.map((match, idx) => (
                    <Card 
                      key={idx}
                      className="bg-card/50 hover:bg-card/70 transition-colors cursor-pointer"
                      onClick={() => onStockSelect(match.stock.symbol)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-semibold">{match.stock.symbol}</div>
                          <Badge variant="secondary" className="text-xs">
                            {match.patterns.length} pattern{match.patterns.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          {match.patterns.map((pattern, pidx) => (
                            <div key={pidx} className="text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-medium">{pattern.pattern}</div>
                                <Badge variant="outline" className="text-xs">
                                  {(pattern.confidence * 100).toFixed(0)}%
                                </Badge>
                              </div>
                              <div className="text-muted-foreground">{pattern.description}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                      <Activity size={48} className="mb-4 opacity-50" />
                      <p>No pattern matches found</p>
                      <p className="text-sm">Patterns will appear as market data updates</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="volume" className="h-full mt-0">
              <div className="h-full overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-yellow-400" />
                      Unusual Volume Activity
                    </h3>
                    <div className="space-y-2">
                      {marketScan?.volumeAnalysis.unusualVolume && marketScan.volumeAnalysis.unusualVolume.length > 0 ? marketScan.volumeAnalysis.unusualVolume.slice(0, 10).map((stock) => (
                        <Card 
                          key={stock.symbol}
                          className="bg-card/50 hover:bg-card/70 transition-colors cursor-pointer"
                          onClick={() => onStockSelect(stock.symbol)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-sm">{stock.symbol}</div>
                                <div className="text-xs text-muted-foreground">
                                  {(stock.volume / 1000000).toFixed(1)}M volume
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={cn(
                                  "text-sm font-semibold",
                                  stock.changePercent >= 0 ? "text-green-400" : "text-red-400"
                                )}>
                                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ${stock.price.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No unusual volume detected</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 size={16} className="text-blue-400" />
                      Volume Leaders
                    </h3>
                    <div className="space-y-2">
                      {marketScan?.volumeAnalysis.volumeLeaders && marketScan.volumeAnalysis.volumeLeaders.length > 0 ? marketScan.volumeAnalysis.volumeLeaders.slice(0, 10).map((stock, idx) => (
                        <Card 
                          key={stock.symbol}
                          className="bg-card/50 hover:bg-card/70 transition-colors cursor-pointer"
                          onClick={() => onStockSelect(stock.symbol)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="text-xs">
                                  #{idx + 1}
                                </Badge>
                                <div>
                                  <div className="font-semibold text-sm">{stock.symbol}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {(stock.volume / 1000000).toFixed(1)}M volume
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={cn(
                                  "text-sm font-semibold",
                                  stock.changePercent >= 0 ? "text-green-400" : "text-red-400"
                                )}>
                                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ${stock.price.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No volume data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}