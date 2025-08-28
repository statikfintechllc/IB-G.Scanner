import { useState, useEffect } from 'react';
import { IBKRConnection } from '@/types';
import { ibkrService } from '@/lib/ibkr';
import { useKV } from '@github/spark/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Settings, Wifi, WifiOff, AlertTriangle, CheckCircle, XCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function IBKRSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [connection, setConnection] = useState<IBKRConnection>({
    host: 'localhost',
    port: 7497,
    clientId: 1,
    connected: false,
    status: 'disconnected'
  });
  const [config, setConfig] = useKV<Partial<IBKRConnection>>('ibkr-config', {
    host: 'localhost',
    port: 7497,
    clientId: 1
  });
  const [isConnecting, setIsConnecting] = useState(false);

  // Update connection status
  useEffect(() => {
    const interval = setInterval(() => {
      const currentConnection = ibkrService.getConnection();
      setConnection(currentConnection);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      const success = await ibkrService.connect(config);
      if (success) {
        toast.success('Connected to IBKR TWS');
      } else {
        toast.error('Failed to connect to IBKR TWS');
      }
    } catch (error) {
      toast.error('Connection error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    ibkrService.disconnect();
    toast.success('Disconnected from IBKR TWS');
  };

  const handleConfigChange = (key: keyof IBKRConnection, value: string | number) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
  };

  const getStatusIcon = () => {
    switch (connection.status) {
      case 'connected':
        return <CheckCircle size={16} className="text-success" />;
      case 'connecting':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />;
      case 'error':
        return <XCircle size={16} className="text-destructive" />;
      default:
        return <WifiOff size={16} className="text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (connection.status) {
      case 'connected':
        return 'bg-success text-success-foreground';
      case 'connecting':
        return 'bg-blue-500 text-white';
      case 'error':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = () => {
    switch (connection.status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="hidden sm:inline">IBKR</span>
          </div>
          <Badge 
            className={cn("absolute -top-2 -right-2 h-5 px-1 text-xs", getStatusColor())}
          >
            {connection.status === 'connected' ? '●' : '○'}
          </Badge>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="w-[75vw] max-w-[75vw] h-[70vh] overflow-hidden flex flex-col p-4">
        <DialogHeader className="flex-shrink-0 pb-3">
          <DialogTitle className="text-base flex items-center gap-2">
            <Settings size={16} />
            IBKR TWS Connection Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="space-y-4 max-w-4xl">
            {/* Connection Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wifi size={16} />
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status:</span>
                  <Badge className={cn("text-xs px-2 py-1", getStatusColor())}>
                    {getStatusIcon()}
                    <span className="ml-1">{getStatusLabel()}</span>
                  </Badge>
                </div>
                
                {connection.connected && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Host:</span>
                      <span className="font-mono text-xs">{connection.host}:{connection.port}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Client ID:</span>
                      <span className="font-mono text-xs">{connection.clientId}</span>
                    </div>
                  </>
                )}
                
                {connection.error && (
                  <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/50">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle size={14} />
                      <span className="font-semibold text-xs">Connection Error</span>
                    </div>
                    <p className="text-xs mt-1">{connection.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connection Configuration */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="host" className="text-sm">TWS Host</Label>
                    <Input
                      id="host"
                      value={config.host || 'localhost'}
                      onChange={(e) => handleConfigChange('host', e.target.value)}
                      placeholder="localhost"
                      disabled={connection.connected}
                      className="mt-1 text-sm h-9"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      IP address of TWS/Gateway
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="port" className="text-sm">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={config.port || 7497}
                      onChange={(e) => handleConfigChange('port', parseInt(e.target.value) || 7497)}
                      placeholder="7497"
                      disabled={connection.connected}
                      className="mt-1 text-sm h-9"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      7497 (live) or 7496 (paper)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="clientId" className="text-sm">Client ID</Label>
                    <Input
                      id="clientId"
                      type="number"
                      value={config.clientId || 1}
                      onChange={(e) => handleConfigChange('clientId', parseInt(e.target.value) || 1)}
                      placeholder="1"
                      disabled={connection.connected}
                      className="mt-1 text-sm h-9"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Unique identifier (1-32)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connection Controls */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex gap-3">
                  {connection.connected ? (
                    <Button 
                      variant="destructive" 
                      onClick={handleDisconnect}
                      className="flex-1 text-sm h-9"
                    >
                      <WifiOff size={14} className="mr-2" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="flex-1 text-sm h-9"
                    >
                      {isConnecting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      ) : (
                        <Wifi size={14} className="mr-2" />
                      )}
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Setup Instructions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Setup Instructions</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Quick Setup</h4>
                    <div className="text-sm space-y-2">
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-sm">1.</span>
                        <span>Install and run TWS or IB Gateway</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-sm">2.</span>
                        <span>Enable API: File → Global Configuration → API → Settings</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-sm">3.</span>
                        <span>Check "Enable ActiveX and Socket Clients"</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-sm">4.</span>
                        <span>Set Socket port: 7497 (live) or 7496 (paper)</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-sm">5.</span>
                        <span>Add "127.0.0.1" to trusted IP addresses</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-sm">6.</span>
                        <span>Restart TWS and connect</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Important Notes</h4>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                        <AlertTriangle size={14} />
                        <span className="font-semibold text-sm">Development Mode</span>
                      </div>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        This app requires a proxy server to connect to IBKR's socket API. 
                        In development mode, mock data is used for demonstration.
                      </p>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                        <AlertTriangle size={14} />
                        <span className="font-semibold text-sm">Security</span>
                      </div>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Never share your IBKR credentials. This app only connects to your local TWS instance.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}