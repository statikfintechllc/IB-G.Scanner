import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, BarChart } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Tab, Stock } from '@/types';
import { TabSelector } from './TabSelector';

interface TabSystemProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onAddTab: (symbol: string) => void;
  stocks: Stock[];
  maxTabs?: number;
}

export function TabSystem({ 
  tabs, 
  activeTabId, 
  onTabChange, 
  onTabClose, 
  onAddTab,
  stocks,
  maxTabs = 6 
}: TabSystemProps) {
  const [draggedTab, setDraggedTab] = useState<string | null>(null);

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabClose(tabId);
  };

  const canAddTab = tabs.length < maxTabs;
  const openTabSymbols = tabs.filter(tab => tab.symbol).map(tab => tab.symbol!);

  return (
    <div className="flex items-center bg-card border-b border-border overflow-x-auto">
      <div className="flex items-center min-w-0 flex-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "group relative flex items-center gap-2 px-4 py-3 min-w-0 cursor-pointer border-r border-border transition-colors",
              "hover:bg-muted/50",
              activeTabId === tab.id && "bg-background border-b-2 border-b-accent"
            )}
            onClick={() => onTabChange(tab.id)}
          >
            <div className="flex items-center gap-2 min-w-0">
              {tab.type === 'scanner' ? (
                <BarChart size={16} className="text-muted-foreground flex-shrink-0" />
              ) : (
                <div className="w-2 h-2 bg-accent rounded-full flex-shrink-0" />
              )}
              <span className="text-sm font-medium truncate">
                {tab.title}
              </span>
            </div>
            
            {tab.type !== 'scanner' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 hover:text-destructive"
                onClick={(e) => handleTabClose(e, tab.id)}
              >
                <X size={12} />
              </Button>
            )}
          </div>
        ))}
      </div>

      {canAddTab && (
        <TabSelector 
          stocks={stocks}
          onStockSelect={onAddTab}
          openTabSymbols={openTabSymbols}
        />
      )}
    </div>
  );
}

export type { Tab };