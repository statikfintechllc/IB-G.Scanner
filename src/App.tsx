import { useState, useEffect } from 'react';
import { Stock, ScannerFilters, Tab } from '@/types';
import { generateMockData, updateStockPrices } from '@/lib/mockData';
import { getMarketHours } from '@/lib/market';
import { alertService } from '@/lib/alerts';
import { ibkrService } from '@/lib/ibkr';
import { useKV } from '@github/spark/hooks';
import { ScannerTable } from '@/components/ScannerTable';
import { FilterPanel } from '@/components/FilterPanel';
import { MarketStatus } from '@/components/MarketStatus';
import { TabSystem } from '@/components/TabSystem';
import { StockChart } from '@/components/StockChart';
import { AlertsManager } from '@/components/AlertsManager';
import { IBKRSettings } from '@/components/IBKRSettings';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';

const DEFAULT_FILTERS: ScannerFilters = {
  priceMin: 0.01,
  priceMax: 5.00,
  marketCapMin: 1_000_000,
  marketCapMax: 2_000_000_000,
  floatMin: 1_000_000,
  floatMax: 1_000_000_000,
  volumeMin: 100_000,
  changeMin: -100,
  changeMax: 100,
  newsOnly: false
};

function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [filters, setFilters] = useKV<ScannerFilters>('scanner-filters', DEFAULT_FILTERS);
  const [tabs, setTabs] = useKV<Tab[]>('scanner-tabs', [
    { id: 'scanner', type: 'scanner', title: 'Scanner' }
  ]);
  const [activeTabId, setActiveTabId] = useKV<string>('active-tab', 'scanner');

  // Initialize data
  useEffect(() => {
    const initialData = generateMockData();
    setStocks(initialData);
  }, []);

  // Real-time updates
  useEffect(() => {
    if (stocks.length === 0) return;

    const marketHours = getMarketHours();
    const updateInterval = marketHours.isOpen ? 3000 : 30000; // 3s during market hours, 30s when closed

    const interval = setInterval(() => {
      setStocks(prevStocks => {
        const updatedStocks = updateStockPrices(prevStocks);
        // Check alerts on updated data
        alertService.checkAlerts(updatedStocks);
        return updatedStocks;
      });
    }, updateInterval);

    return () => clearInterval(interval);
  }, [stocks.length]);

  // Listen for chart open events from alerts
  useEffect(() => {
    const handleOpenChart = (event: CustomEvent) => {
      const { symbol } = event.detail;
      handleStockSelect(symbol);
    };

    window.addEventListener('openChart', handleOpenChart as EventListener);
    return () => window.removeEventListener('openChart', handleOpenChart as EventListener);
  }, []);

  // Apply filters
  useEffect(() => {
    const filtered = stocks.filter(stock => {
      if (stock.price < filters.priceMin || stock.price > filters.priceMax) return false;
      if (stock.marketCap < filters.marketCapMin || stock.marketCap > filters.marketCapMax) return false;
      if (stock.float < filters.floatMin || stock.float > filters.floatMax) return false;
      if (stock.volume < filters.volumeMin) return false;
      if (stock.changePercent < filters.changeMin || stock.changePercent > filters.changeMax) return false;
      if (filters.newsOnly && stock.news === 0) return false;
      return true;
    });
    
    setFilteredStocks(filtered);
  }, [stocks, filters]);

  // Market hours theme
  const marketHours = getMarketHours();
  const getMarketThemeClass = () => {
    switch (marketHours.status) {
      case 'premarket':
        return 'market-premarket';
      case 'regular':
        return 'market-regular';
      case 'afterhours':
        return 'market-afterhours';
      case 'closed':
        return 'market-closed';
      default:
        return 'market-closed';
    }
  };

  const handleStockSelect = (symbol: string) => {
    const existingTab = tabs.find(tab => tab.symbol === symbol);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    if (tabs.length >= 6) {
      return; // Max tabs reached
    }

    const newTab: Tab = {
      id: `chart-${symbol}-${Date.now()}`,
      type: 'chart',
      title: symbol,
      symbol
    };

    setTabs(prevTabs => [...prevTabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleTabClose = (tabId: string) => {
    if (tabId === 'scanner') return; // Can't close scanner tab

    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      // If we closed the active tab, switch to scanner
      if (activeTabId === tabId) {
        setActiveTabId('scanner');
      }
      
      return newTabs;
    });
  };

  const handleAddTab = () => {
    // For demo, just add a random stock
    if (filteredStocks.length > 0) {
      const randomStock = filteredStocks[Math.floor(Math.random() * filteredStocks.length)];
      handleStockSelect(randomStock.symbol);
    }
  };

  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const currentStock = activeTab?.symbol ? stocks.find(s => s.symbol === activeTab.symbol) : null;

  return (
    <div className={cn(
      "min-h-screen bg-background text-foreground transition-colors duration-300",
      getMarketThemeClass()
    )}>
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold font-mono">Penny Stock Scanner Pro</h1>
            <MarketStatus />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {filteredStocks.length} stocks • Updated {new Date().toLocaleTimeString()}
            </div>
            <AlertsManager />
            <IBKRSettings />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabSystem
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        onTabClose={handleTabClose}
        onAddTab={handleAddTab}
        maxTabs={6}
      />

      {/* Content */}
      <div className="h-[calc(100vh-8rem)] overflow-hidden">
        {activeTab?.type === 'scanner' ? (
          <div className="h-full flex flex-col">
            <div className="p-6 pb-0">
              <FilterPanel 
                filters={filters} 
                onFiltersChange={setFilters}
              />
            </div>
            <div className="flex-1 overflow-auto p-6 pt-0">
              <ScannerTable 
                stocks={filteredStocks}
                onStockSelect={handleStockSelect}
              />
            </div>
          </div>
        ) : (
          <div className="h-full">
            {activeTab?.symbol && (
              <StockChart 
                symbol={activeTab.symbol}
                currentPrice={currentStock?.price}
                change={currentStock?.change}
                changePercent={currentStock?.changePercent}
              />
            )}
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        theme="dark"
        richColors
        expand={true}
        duration={4000}
      />
    </div>
  );
}

export default App;