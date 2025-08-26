import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Plus, BarChart } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  type: 'scanner' | 'chart';
  title: string;
  symbol?: string;
}

interface TabSystemProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onAddTab: () => void;
  maxTabs?: number;
}

export function TabSystem({ 
  tabs, 
  activeTabId, 
  onTabChange, 
  onTabClose, 
  onAddTab,
  maxTabs = 6 
}: TabSystemProps) {
  const [draggedTab, setDraggedTab] = useState<string | null>(null);

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabClose(tabId);
  };

  const canAddTab = tabs.length < maxTabs;

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
        <Button
          size="sm"
          variant="ghost"
          onClick={onAddTab}
          className="px-3 py-2 border-l border-border rounded-none hover:bg-muted/50 flex-shrink-0"
          title="Add new chart tab"
        >
          <Plus size={16} />
        </Button>
      )}
    </div>
  );
}