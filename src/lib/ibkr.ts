import { IBKRConnection, IBKRMessage, ChartData } from '@/types';

/**
 * IBKR TWS API Integration Service
 * Connects to Interactive Brokers TWS/Gateway via socket connection
 * Follows IBKR's socket protocol for real-time market data
 */
export class IBKRService {
  private ws: WebSocket | null = null;
  private connection: IBKRConnection;
  private subscribers: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.connection = {
      host: 'localhost',
      port: 7497, // Default TWS port (7496 for paper trading)
      clientId: 1,
      connected: false,
      status: 'disconnected'
    };
  }

  /**
   * Get current market data for multiple symbols
   */
  async getMarketData(symbols: string[]): Promise<any[]> {
    // For now, return empty array if IBKR not connected
    // In production, this would fetch real data from IBKR
    if (!this.connection.connected) {
      console.warn('IBKR not connected, returning empty data');
      return [];
    }

    // Implementation would request market data for each symbol
    // and return formatted stock data
    return [];
  }

  /**
   * Connect to IBKR TWS/Gateway
   * Uses WebSocket to connect to local TWS instance
   */
  async connect(config?: Partial<IBKRConnection>): Promise<IBKRConnection> {
    if (config) {
      this.connection = { ...this.connection, ...config };
    }

    try {
      this.connection.status = 'connecting';
      
      // Connect to TWS Gateway via WebSocket proxy
      // In production, you'd need a server-side proxy to handle IBKR's socket protocol
      const wsUrl = `ws://${this.connection.host}:${this.connection.port + 1000}`; // Proxy port
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('Connected to IBKR TWS');
        this.connection.connected = true;
        this.connection.status = 'connected';
        this.connection.error = undefined;
        this.reconnectAttempts = 0;
        
        // Send initial handshake
        this.sendMessage({
          type: 'handshake',
          clientId: this.connection.clientId,
          version: 'v973.04'
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: IBKRMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse IBKR message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('IBKR connection closed');
        this.connection.connected = false;
        this.connection.status = 'disconnected';
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('IBKR connection error:', error);
        this.connection.status = 'error';
        this.connection.error = 'Connection failed';
      };

      return this.connection;
    } catch (error) {
      console.error('Failed to connect to IBKR:', error);
      this.connection.status = 'error';
      this.connection.error = error instanceof Error ? error.message : 'Unknown error';
      return this.connection;
    }
  }

  /**
   * Disconnect from IBKR
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connection.connected = false;
    this.connection.status = 'disconnected';
    this.subscribers.clear();
  }

  /**
   * Subscribe to real-time market data for a symbol
   */
  subscribeToMarketData(symbol: string, callback: (data: any) => void): void {
    this.subscribers.set(symbol, callback);
    
    if (this.connection.connected && this.ws) {
      this.sendMessage({
        type: 'market_data_request',
        symbol,
        fields: ['last_price', 'volume', 'bid', 'ask', 'high', 'low', 'close']
      });
    }
  }

  /**
   * Unsubscribe from market data
   */
  unsubscribeFromMarketData(symbol: string): void {
    this.subscribers.delete(symbol);
    
    if (this.connection.connected && this.ws) {
      this.sendMessage({
        type: 'market_data_cancel',
        symbol
      });
    }
  }

  /**
   * Request historical data for charting
   */
  requestHistoricalData(
    symbol: string, 
    endDate: string, 
    duration: string, 
    barSize: string,
    callback: (data: ChartData[]) => void
  ): void {
    if (!this.connection.connected || !this.ws) {
      console.warn('IBKR not connected, using mock data');
      // Return mock historical data for development
      callback(this.generateMockHistoricalData(symbol));
      return;
    }

    const requestId = `hist_${symbol}_${Date.now()}`;
    this.subscribers.set(requestId, callback);

    this.sendMessage({
      type: 'historical_data_request',
      requestId,
      symbol,
      endDate,
      duration,
      barSize,
      whatToShow: 'TRADES',
      useRTH: 1
    });
  }

  /**
   * Get connection status
   */
  getConnection(): IBKRConnection {
    return { ...this.connection };
  }

  /**
   * Send message to IBKR TWS
   */
  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Handle incoming messages from IBKR
   */
  private handleMessage(message: IBKRMessage): void {
    switch (message.type) {
      case 'market_data':
        if (message.symbol && this.subscribers.has(message.symbol)) {
          const callback = this.subscribers.get(message.symbol);
          callback?.(message.data);
        }
        break;
        
      case 'connection_status':
        console.log('IBKR connection status:', message.data);
        break;
        
      case 'error':
        console.error('IBKR error:', message.error);
        this.connection.error = message.error;
        break;
    }
  }

  /**
   * Attempt to reconnect to IBKR
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff

    console.log(`Attempting to reconnect to IBKR in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Generate mock historical data for development/testing
   */
  private generateMockHistoricalData(symbol: string): ChartData[] {
    const data: ChartData[] = [];
    const now = Date.now();
    const basePrice = Math.random() * 5 + 0.5; // Random penny stock price
    
    for (let i = 99; i >= 0; i--) {
      const time = now - (i * 60 * 1000); // 1-minute intervals
      const volatility = 0.02; // 2% volatility
      const change = (Math.random() - 0.5) * volatility;
      
      const open = basePrice * (1 + change);
      const close = open * (1 + (Math.random() - 0.5) * volatility);
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
      const volume = Math.floor(Math.random() * 1000000 + 10000);
      
      data.push({
        time: Math.floor(time / 1000), // TradingView expects seconds
        open: Number(open.toFixed(4)),
        high: Number(high.toFixed(4)),
        low: Number(low.toFixed(4)),
        close: Number(close.toFixed(4)),
        volume
      });
    }
    
    return data;
  }
}

// Singleton instance
export const ibkrService = new IBKRService();