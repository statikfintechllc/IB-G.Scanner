import { useState, useEffect } from 'react';
import { PriceAlert, NotificationSettings } from '@/types';
import { alertService } from '@/lib/alerts';
import { useKV } from '@github/spark/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Bell, Plus, Trash2, Target, TrendingUp, Volume2, AlertTriangle, Brain, Lightbulb } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AlertsManagerProps {
  symbol?: string; // If provided, opens with alert for this symbol
}

export function AlertsManager({ symbol }: AlertsManagerProps) {
  const [alerts, setAlerts] = useKV<PriceAlert[]>('price-alerts', []);
  const [settings, setSettings] = useKV<NotificationSettings>('notification-settings', {
    enabled: true,
    sound: true,
    desktop: true,
    priceAlerts: true,
    volumeAlerts: true,
    newsAlerts: true
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    symbol: symbol || '',
    type: 'price_above' as PriceAlert['type'],
    value: 0
  });

  // Sync alerts with service
  useEffect(() => {
    // Load alerts into service
    alerts.forEach(alert => {
      if (!alertService.getAlerts().find(a => a.id === alert.id)) {
        alertService.addAlert(alert);
      }
    });

    // Update settings
    alertService.updateSettings(settings);
  }, [alerts, settings]);

  // Update alerts from service (when triggered) - Fixed to prevent loops
  useEffect(() => {
    const handleAlertUpdate = () => {
      const serviceAlerts = alertService.getAlerts();
      setAlerts(current => {
        const updatedAlerts = current.map(alert => {
          const serviceAlert = serviceAlerts.find(a => a.id === alert.id);
          return serviceAlert || alert;
        });
        
        // Only update if there are actual changes to prevent infinite loops
        const hasChanges = updatedAlerts.some((alert, index) => {
          const currentAlert = current[index];
          return !currentAlert || 
                 alert.triggered !== currentAlert.triggered ||
                 alert.message !== currentAlert.message;
        });
        
        return hasChanges ? updatedAlerts : current;
      });
    };

    // Listen for alert events instead of polling
    window.addEventListener('alertTriggered', handleAlertUpdate);
    return () => window.removeEventListener('alertTriggered', handleAlertUpdate);
  }, [setAlerts]);

  const handleAddAlert = () => {
    if (!newAlert.symbol || !newAlert.value) {
      toast.error('Please fill in all fields');
      return;
    }

    const alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'> = {
      symbol: newAlert.symbol.toUpperCase(),
      type: newAlert.type,
      value: newAlert.value,
      enabled: true
    };

    const id = alertService.addAlert(alert);
    const fullAlert: PriceAlert = {
      ...alert,
      id,
      createdAt: new Date(),
      triggered: false
    };

    setAlerts(current => [...current, fullAlert]);
    setNewAlert({ symbol: symbol || '', type: 'price_above', value: 0 });
    toast.success('Alert created successfully');
  };

  const handleRemoveAlert = (alertId: string) => {
    alertService.removeAlert(alertId);
    setAlerts(current => current.filter(alert => alert.id !== alertId));
    toast.success('Alert removed');
  };

  const handleToggleAlert = (alertId: string, enabled: boolean) => {
    setAlerts(current => current.map(alert => 
      alert.id === alertId ? { ...alert, enabled } : alert
    ));
  };

  const handleResetAlert = (alertId: string) => {
    alertService.resetAlert(alertId);
    setAlerts(current => current.map(alert => 
      alert.id === alertId ? { ...alert, triggered: false, message: undefined } : alert
    ));
  };

  const handleClearTriggered = () => {
    alertService.clearTriggeredAlerts();
    setAlerts(current => current.filter(alert => !alert.triggered));
    toast.success('Triggered alerts cleared');
  };

  const handleSettingsChange = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    alertService.updateSettings(newSettings);
  };

  const getAlertIcon = (type: PriceAlert['type']) => {
    switch (type) {
      case 'price_above': return <TrendingUp size={16} />;
      case 'price_below': return <TrendingUp size={16} className="rotate-180" />;
      case 'volume_spike': return <Volume2 size={16} />;
      case 'breakout': return <Target size={16} />;
      case 'pattern_recognition': return <Brain size={16} />;
      case 'ai_signal': return <Lightbulb size={16} />;
    }
  };

  const getAlertTypeLabel = (type: PriceAlert['type']) => {
    switch (type) {
      case 'price_above': return 'Price Above';
      case 'price_below': return 'Price Below';
      case 'volume_spike': return 'Volume Spike';
      case 'breakout': return 'Breakout Pattern';
      case 'pattern_recognition': return 'Pattern Recognition';
      case 'ai_signal': return 'AI Signal';
    }
  };

  const formatAlertValue = (type: PriceAlert['type'], value: number) => {
    switch (type) {
      case 'price_above':
      case 'price_below':
        return `$${value.toFixed(4)}`;
      case 'volume_spike':
        return `${(value / 1000000).toFixed(1)}M avg`;
      case 'breakout':
        return 'Pattern';
      case 'pattern_recognition':
        return `${value}% confidence`;
      case 'ai_signal':
        return `Score: ${value}`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell size={16} className="mr-2" />
          Alerts
          {alerts.filter(a => a.triggered).length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {alerts.filter(a => a.triggered).length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Bell size={20} />
            Price Alerts & Notifications
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6 pb-6">
          <Tabs defaultValue="alerts" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0">
              <TabsContent value="alerts" className="h-full mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  {/* Add New Alert */}
                  <Card className="flex-shrink-0 h-fit">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Plus size={18} />
                        Create New Alert
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 px-4 pb-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label htmlFor="symbol" className="text-sm font-medium">Symbol</Label>
                          <Input
                            id="symbol"
                            placeholder="AAPL"
                            value={newAlert.symbol}
                            onChange={(e) => setNewAlert(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                            className="font-mono mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="type" className="text-sm font-medium">Alert Type</Label>
                          <Select value={newAlert.type} onValueChange={(value: PriceAlert['type']) => setNewAlert(prev => ({ ...prev, type: value }))}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="price_above">Price Above</SelectItem>
                              <SelectItem value="price_below">Price Below</SelectItem>
                              <SelectItem value="volume_spike">Volume Spike</SelectItem>
                              <SelectItem value="breakout">Breakout Pattern</SelectItem>
                              <SelectItem value="pattern_recognition">Pattern Recognition</SelectItem>
                              <SelectItem value="ai_signal">AI Signal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                  
                        <div>
                          <Label htmlFor="value" className="text-sm font-medium">
                            {newAlert.type === 'volume_spike' ? 'Average Volume' : newAlert.type === 'breakout' ? 'Sensitivity' : 'Price'}
                          </Label>
                          <Input
                            id="value"
                            type="number"
                            step={newAlert.type.includes('price') ? '0.0001' : '1000'}
                            placeholder={newAlert.type === 'volume_spike' ? '1000000' : newAlert.type === 'breakout' ? '1' : '1.0000'}
                            value={newAlert.value || ''}
                            onChange={(e) => setNewAlert(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                            className="mt-1"
                          />
                        </div>
                  
                        <div className="pt-2">
                          <Button onClick={handleAddAlert} className="w-full">
                            <Plus size={16} className="mr-2" />
                            Add Alert
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Active Alerts */}
                  <div className="flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                      <h3 className="text-lg font-semibold">Active Alerts ({alerts.length})</h3>
                      {alerts.some(a => a.triggered) && (
                        <Button variant="outline" size="sm" onClick={handleClearTriggered}>
                          Clear Triggered
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden">
                      <div className="h-full overflow-y-auto custom-scrollbar">
                        {alerts.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground h-full flex flex-col items-center justify-center px-4">
                            <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-base">No alerts configured</p>
                            <p className="text-sm">Create your first alert</p>
                          </div>
                        ) : (
                          <div className="p-4 space-y-3">
                            {alerts.map(alert => (
                              <div 
                                key={alert.id}
                                className={cn(
                                  "flex items-center justify-between p-4 rounded-lg border",
                                  alert.triggered ? "bg-destructive/10 border-destructive/50" : "bg-card"
                                )}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className={cn(
                                    "p-2 rounded-full flex-shrink-0",
                                    alert.triggered ? "bg-destructive/20" : "bg-muted"
                                  )}>
                                    {getAlertIcon(alert.type)}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-semibold text-sm">{alert.symbol}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {getAlertTypeLabel(alert.type)}
                                      </Badge>
                                      <span className="text-sm text-muted-foreground">
                                        {formatAlertValue(alert.type, alert.value)}
                                      </span>
                                    </div>
                                    
                                    {alert.triggered && alert.message && (
                                      <p className="text-sm text-destructive mt-1 truncate">{alert.message}</p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Switch
                                    checked={alert.enabled}
                                    onCheckedChange={(enabled) => handleToggleAlert(alert.id, enabled)}
                                  />
                                  
                                  {alert.triggered && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleResetAlert(alert.id)}
                                    >
                                      Reset
                                    </Button>
                                  )}
                                  
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleRemoveAlert(alert.id)}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="h-full mt-0">
                <div className="h-full overflow-y-auto custom-scrollbar">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Notification Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="enabled">Enable Notifications</Label>
                          <p className="text-sm text-muted-foreground">Master switch for all notifications</p>
                        </div>
                        <Switch
                          id="enabled"
                          checked={settings.enabled}
                          onCheckedChange={(checked) => handleSettingsChange('enabled', checked)}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="sound">Sound Notifications</Label>
                          <p className="text-sm text-muted-foreground">Play sound when alerts trigger</p>
                        </div>
                        <Switch
                          id="sound"
                          checked={settings.sound}
                          onCheckedChange={(checked) => handleSettingsChange('sound', checked)}
                          disabled={!settings.enabled}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="desktop">Desktop Notifications</Label>
                          <p className="text-sm text-muted-foreground">Show browser notifications</p>
                        </div>
                        <Switch
                          id="desktop"
                          checked={settings.desktop}
                          onCheckedChange={(checked) => handleSettingsChange('desktop', checked)}
                          disabled={!settings.enabled}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="priceAlerts">Price Alerts</Label>
                          <p className="text-sm text-muted-foreground">Enable price-based alerts</p>
                        </div>
                        <Switch
                          id="priceAlerts"
                          checked={settings.priceAlerts}
                          onCheckedChange={(checked) => handleSettingsChange('priceAlerts', checked)}
                          disabled={!settings.enabled}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="volumeAlerts">Volume Alerts</Label>
                          <p className="text-sm text-muted-foreground">Enable volume spike alerts</p>
                        </div>
                        <Switch
                          id="volumeAlerts"
                          checked={settings.volumeAlerts}
                          onCheckedChange={(checked) => handleSettingsChange('volumeAlerts', checked)}
                          disabled={!settings.enabled}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="newsAlerts">News Alerts</Label>
                          <p className="text-sm text-muted-foreground">Enable news-based alerts</p>
                        </div>
                        <Switch
                          id="newsAlerts"
                          checked={settings.newsAlerts}
                          onCheckedChange={(checked) => handleSettingsChange('newsAlerts', checked)}
                          disabled={!settings.enabled}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
        <div className="p-6"></div>
      </DialogContent>
    </Dialog>
  );
}