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
      
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Settings size={20} />
            IBKR TWS Connection Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 pb-6">
          <div className="space-y-8 max-w-3xl mx-auto">
            {/* Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Wifi size={20} />
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg">Status:</span>
                  <Badge className={cn("text-lg px-4 py-2", getStatusColor())}>
                    {getStatusIcon()}
                    <span className="ml-2">{getStatusLabel()}</span>
                  </Badge>
                </div>
                
                {connection.connected && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-lg">Host:</span>
                      <span className="font-mono text-lg">{connection.host}:{connection.port}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg">Client ID:</span>
                      <span className="font-mono text-lg">{connection.clientId}</span>
                    </div>
                  </>
                )}
                
                {connection.error && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/50">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle size={18} />
                      <span className="font-semibold text-lg">Connection Error</span>
                    </div>
                    <p className="text-base mt-2">{connection.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connection Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="host" className="text-lg">TWS Host</Label>
                    <Input
                      id="host"
                      value={config.host || 'localhost'}
                      onChange={(e) => handleConfigChange('host', e.target.value)}
                      placeholder="localhost"
                      disabled={connection.connected}
                      className="mt-2 text-lg"
                    />
                    <p className="text-base text-muted-foreground mt-2">
                      IP address of TWS/Gateway
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="port" className="text-lg">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={config.port || 7497}
                      onChange={(e) => handleConfigChange('port', parseInt(e.target.value) || 7497)}
                      placeholder="7497"
                      disabled={connection.connected}
                      className="mt-2 text-lg"
                    />
                    <p className="text-base text-muted-foreground mt-2">
                      7497 (live) or 7496 (paper)
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="clientId" className="text-lg">Client ID</Label>
                  <Input
                    id="clientId"
                    type="number"
                    value={config.clientId || 1}
                    onChange={(e) => handleConfigChange('clientId', parseInt(e.target.value) || 1)}
                    placeholder="1"
                    disabled={connection.connected}
                    className="mt-2 text-lg"
                  />
                  <p className="text-base text-muted-foreground mt-2">
                    Unique identifier (1-32)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Connection Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {connection.connected ? (
                    <Button 
                      variant="destructive" 
                      onClick={handleDisconnect}
                      className="flex-1 text-lg py-6"
                    >
                      <WifiOff size={18} className="mr-2" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="flex-1 text-lg py-6"
                    >
                      {isConnecting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      ) : (
                        <Wifi size={18} className="mr-2" />
                      )}
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Setup Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Setup Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-base space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg">1.</span>
                    <span>Install and run TWS or IB Gateway on this computer</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg">2.</span>
                    <span>Enable API connections in TWS: File → Global Configuration → API → Settings</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg">3.</span>
                    <span>Check "Enable ActiveX and Socket Clients"</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg">4.</span>
                    <span>Set Socket port to 7497 (live) or 7496 (paper trading)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg">5.</span>
                    <span>Add "127.0.0.1" to trusted IP addresses</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg">6.</span>
                    <span>Restart TWS and try connecting</span>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                    <AlertTriangle size={18} />
                    <span className="font-semibold text-lg">Note</span>
                  </div>
                  <p className="text-base text-blue-600 dark:text-blue-400">
                    This app requires a proxy server to connect to IBKR's socket API. 
                    In development mode, mock data is used for demonstration.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}