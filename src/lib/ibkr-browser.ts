/**
 * Browser-Only IBKR Service for PWA
 * Connects directly to IBKR Client Portal Web without Node.js backend
 * Designed for iPhone PWA deployment
 */

export class IBKRBrowserService {
  private isAuthenticated = false;
  private sessionId: string | null = null;
  private baseUrl = 'https://cdcdyn.interactivebrokers.com/portal.proxy/v1/api';
  private subscribers: Map<string, (data: any) => void> = new Map();
  private authWindow: Window | null = null;

  constructor() {
    // Check for existing session on startup
    this.checkExistingSession();
  }

  /**
   * Check if user is already authenticated with IBKR Client Portal
   */
  private async checkExistingSession(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/iserver/auth/status`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.isAuthenticated = data.authenticated || false;
        this.sessionId = data.session_id || null;
        return this.isAuthenticated;
      }
    } catch (error) {
      console.warn('No existing IBKR session found:', error);
    }
    return false;
  }

  /**
   * Open IBKR Client Portal login in a popup window
   */
  async authenticateWithPopup(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      // Open IBKR login page in popup
      const loginUrl = 'https://cdcdyn.interactivebrokers.com/portal/';
      this.authWindow = window.open(
        loginUrl,
        'ibkr-auth',
        'width=800,height=600,scrollbars=yes,resizable=yes'
      );

      // Check authentication status periodically
      const checkAuth = async () => {
        try {
          const isAuth = await this.checkExistingSession();
          if (isAuth) {
            this.authWindow?.close();
            resolve({ success: true });
            return;
          }
        } catch (error) {
          // Continue checking
        }

        // Check if popup was closed manually
        if (this.authWindow?.closed) {
          resolve({ success: false, error: 'Authentication cancelled' });
          return;
        }

        // Check again in 2 seconds
        setTimeout(checkAuth, 2000);
      };

      // Start checking after 3 seconds
      setTimeout(checkAuth, 3000);
    });
  }

  /**
   * Get account information
   */
  async getAccounts(): Promise<any[]> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with IBKR');
    }

    try {
      const response = await fetch(`${this.baseUrl}/iserver/accounts`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch accounts');
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  }

  /**
   * Get market data for symbols
   */
  async getMarketData(symbols: string[]): Promise<any[]> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with IBKR');
    }

    try {
      // First, resolve contract IDs for symbols
      const contracts = await this.searchContracts(symbols);
      
      if (contracts.length === 0) {
        return [];
      }

      // Get market data snapshots
      const conids = contracts.map(c => c.conid).join(',');
      const fields = '31,84,86'; // Last price, bid, ask
      
      const response = await fetch(
        `${this.baseUrl}/iserver/marketdata/snapshot?conids=${conids}&fields=${fields}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch market data');
    } catch (error) {
      console.error('Error fetching market data:', error);
      throw error;
    }
  }

  /**
   * Search for contract IDs by symbol
   */
  private async searchContracts(symbols: string[]): Promise<any[]> {
    const contracts = [];
    
    for (const symbol of symbols) {
      try {
        const response = await fetch(
          `${this.baseUrl}/iserver/secdef/search?symbol=${symbol}`,
          {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            contracts.push({
              symbol,
              conid: data[0].conid,
              name: data[0].name
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to resolve contract for ${symbol}:`, error);
      }
    }

    return contracts;
  }

  /**
   * Get portfolio positions
   */
  async getPositions(accountId: string): Promise<any[]> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with IBKR');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/portfolio/${accountId}/positions/0`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch positions');
    } catch (error) {
      console.error('Error fetching positions:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time market data
   */
  async subscribeToMarketData(symbols: string[], callback: (data: any) => void): Promise<void> {
    // Store callback for polling updates
    const subscriptionId = symbols.join(',');
    this.subscribers.set(subscriptionId, callback);

    // Start polling for updates every 5 seconds
    const poll = async () => {
      try {
        const data = await this.getMarketData(symbols);
        callback(data);
      } catch (error) {
        console.warn('Market data polling error:', error);
      }

      // Continue polling if subscription still exists
      if (this.subscribers.has(subscriptionId)) {
        setTimeout(poll, 5000);
      }
    };

    // Start polling
    setTimeout(poll, 1000);
  }

  /**
   * Unsubscribe from market data
   */
  unsubscribeFromMarketData(symbols: string[]): void {
    const subscriptionId = symbols.join(',');
    this.subscribers.delete(subscriptionId);
  }

  /**
   * Check connection status
   */
  async getConnectionStatus(): Promise<{ connected: boolean; authenticated: boolean }> {
    const authenticated = await this.checkExistingSession();
    return {
      connected: true, // Always connected in browser
      authenticated
    };
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.warn('Logout error:', error);
    }

    this.isAuthenticated = false;
    this.sessionId = null;
    this.subscribers.clear();
  }
}

// Export singleton instance
export const ibkrBrowserService = new IBKRBrowserService();
