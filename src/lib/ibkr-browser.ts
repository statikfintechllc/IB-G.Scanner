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
      // Try multiple endpoints to detect authentication
      const endpoints = [
        'https://cdcdyn.interactivebrokers.com/v1/api/iserver/auth/status',
        'https://cdcdyn.interactivebrokers.com/v1/api/iserver/accounts'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(10000)
          });

          if (response.ok) {
            const data = await response.json();
            
            // Check for auth status endpoint
            if (endpoint.includes('auth/status')) {
              this.isAuthenticated = data.authenticated === true;
              this.sessionId = data.session_id || null;
              if (this.isAuthenticated) {
                console.log('✅ IBKR authentication confirmed via auth/status');
                return true;
              }
            }
            
            // Check for accounts endpoint (if we get data, we're authenticated)
            if (endpoint.includes('accounts') && Array.isArray(data) && data.length > 0) {
              this.isAuthenticated = true;
              console.log('✅ IBKR authentication confirmed via accounts endpoint');
              return true;
            }
          }
        } catch (error) {
          // Try next endpoint
          continue;
        }
      }

      this.isAuthenticated = false;
      return false;
    } catch (error) {
      console.warn('Session check failed:', error);
      this.isAuthenticated = false;
      return false;
    }
  }  /**
   * Open IBKR Client Portal login in a popup window
   */
  async authenticateWithPopup(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      // Open IBKR login page in popup
      const loginUrl = 'https://cdcdyn.interactivebrokers.com/portal/';
      this.authWindow = window.open(
        loginUrl,
        'ibkr-auth',
        'width=900,height=700,scrollbars=yes,resizable=yes,location=yes'
      );

      if (!this.authWindow) {
        resolve({ success: false, error: 'Failed to open popup window' });
        return;
      }

      let checkCount = 0;
      const maxChecks = 180; // 6 minutes total (180 * 2 seconds)

      // Check authentication status periodically
      const checkAuth = async () => {
        checkCount++;
        
        console.log(`🔍 Checking auth status (attempt ${checkCount}/${maxChecks})...`);

        // Check if popup was closed manually
        if (this.authWindow?.closed) {
          console.log('🪟 Popup window was closed, performing final auth check...');
          // Give it one final check in case they closed after successful auth
          try {
            const finalCheck = await this.checkExistingSession();
            if (finalCheck) {
              console.log('✅ Authentication successful after popup close!');
              resolve({ success: true });
              return;
            }
          } catch (error) {
            console.warn('Final auth check failed:', error);
          }
          
          resolve({ success: false, error: 'Authentication window was closed before completing login' });
          return;
        }

        // Try to check authentication status
        try {
          const isAuthenticated = await this.checkExistingSession();
          if (isAuthenticated) {
            console.log('✅ Authentication successful! Closing popup...');
            this.authWindow?.close();
            resolve({ success: true });
            return;
          }
        } catch (error) {
          console.warn(`Auth check ${checkCount} failed:`, error);
        }

        // Check for timeout
        if (checkCount >= maxChecks) {
          console.log('⏰ Authentication timeout reached');
          this.authWindow?.close();
          resolve({ success: false, error: 'Authentication timed out. Please try again.' });
          return;
        }

        // Continue checking
        setTimeout(checkAuth, 2000);
      };

      // Start checking after 3 seconds (give time for page to load)
      console.log('🚀 Starting authentication flow...');
      setTimeout(checkAuth, 3000);
    });
  }
        try {
          const isAuth = await this.checkExistingSession();
          if (isAuth) {
            this.authWindow?.close();
            resolve({ success: true });
            return;
          }
        } catch (error) {
          // CORS or network error - continue checking
          console.log('Auth check failed (expected during login):', error);
        }

        // Check if we've exceeded max attempts
        if (checkCount >= maxChecks) {
          this.authWindow?.close();
          resolve({ success: false, error: 'Authentication timeout - please try again' });
          return;
        }

        // Check again in 2 seconds
        setTimeout(checkAuth, 2000);
      };

      // Start checking after 3 seconds to allow popup to load
      setTimeout(checkAuth, 3000);

      // Also listen for focus events on the main window
      // This often indicates the user returned from the popup
      const onFocus = async () => {
        if (this.authWindow?.closed) {
          window.removeEventListener('focus', onFocus);
          return;
        }

        try {
          const isAuth = await this.checkExistingSession();
          if (isAuth) {
            window.removeEventListener('focus', onFocus);
            this.authWindow?.close();
            resolve({ success: true });
            return;
          }
        } catch (error) {
          // Continue waiting
        }
      };

      window.addEventListener('focus', onFocus);
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
