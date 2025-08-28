import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, BarChart, Brain } from '@phosphor-icons/react';
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
    <div className="flex items-center bg-card border-b border-border">
      <ScrollArea className="flex-1">
        <div className="flex items-center min-w-0">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "group relative flex items-center gap-2 px-4 py-3 min-w-0 cursor-pointer border-r border-border transition-colors whitespace-nowrap",
                "hover:bg-muted/50",
                activeTabId === tab.id && "bg-background border-b-2 border-b-accent"
              )}
              onClick={() => onTabChange(tab.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {tab.type === 'scanner' ? (
                  <BarChart size={16} className="text-muted-foreground flex-shrink-0" />
                ) : tab.type === 'ai_picks' ? (
                  <Brain size={16} className="text-primary flex-shrink-0" />
                ) : (
                  <div className="w-2 h-2 bg-accent rounded-full flex-shrink-0" />
                )}
                <span className="text-sm font-medium">
                  {tab.title}
                </span>
              </div>
              
              {tab.type !== 'scanner' && tab.type !== 'ai_picks' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 hover:text-destructive ml-2"
                  onClick={(e) => handleTabClose(e, tab.id)}
                >
                  <X size={12} />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {canAddTab && (
        <div className="flex-shrink-0">
          <TabSelector 
            stocks={stocks}
            onStockSelect={onAddTab}
            openTabSymbols={openTabSymbols}
          />
        </div>
      )}
    </div>
  );
}

export type { Tab };