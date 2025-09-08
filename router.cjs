#!/usr/bin/env node

/**
 * SFTi Stock Scanner - IBKR Router Service
 * Handles connection to Interactive Brokers TWS/Gateway and routes data to server
 */

const { connect, reqMktData, reqContractDetails, reqHistoricalData } = require('@ib/tws-api');
const WebSocket = require('ws');
const EventEmitter = require('events');

class IBKRRouter extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            host: options.host || process.env.IBKR_HOST || '127.0.0.1',
            port: parseInt(options.port) || parseInt(process.env.IBKR_PORT) || 7497,
            clientId: parseInt(options.clientId) || parseInt(process.env.IBKR_CLIENT_ID) || 1,
            serverUrl: options.serverUrl || process.env.SERVER_URL || 'ws://localhost:3001',
            reconnectInterval: options.reconnectInterval || 5000,
            maxRetries: options.maxRetries || 10
        };
        
        this.tws = null;
        this.serverWs = null;
        this.connected = false;
        this.retryCount = 0;
        this.subscriptions = new Map();
        this.requestId = 1;
        
        console.log(`[ROUTER] Initializing IBKR Router`);
        console.log(`[ROUTER] IBKR: ${this.config.host}:${this.config.port} (Client ID: ${this.config.clientId})`);
        console.log(`[ROUTER] Server: ${this.config.serverUrl}`);
    }
    
    async start() {
        try {
            await this.connectToIBKR();
            await this.connectToServer();
            this.setupRouting();
            console.log('[ROUTER] Router started successfully');
        } catch (error) {
            console.error('[ROUTER] Failed to start router:', error.message);
            this.handleError(error);
        }
    }
    
    async connectToIBKR() {
        return new Promise((resolve, reject) => {
            console.log('[ROUTER] Connecting to IBKR TWS/Gateway...');
            
            try {
                this.tws = connect({
                    host: this.config.host,
                    port: this.config.port,
                    clientId: this.config.clientId
                });
                
                this.tws.on('connected', () => {
                    console.log('[ROUTER] Connected to IBKR TWS/Gateway ✓');
                    this.connected = true;
                    this.retryCount = 0;
                    this.setupIBKRHandlers();
                    resolve();
                });
                
                this.tws.on('error', (error) => {
                    console.error('[ROUTER] IBKR connection error:', error.message);
                    this.connected = false;
                    reject(error);
                });
                
                this.tws.on('disconnected', () => {
                    console.warn('[ROUTER] Disconnected from IBKR');
                    this.connected = false;
                    this.handleReconnection();
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    async connectToServer() {
        return new Promise((resolve, reject) => {
            console.log('[ROUTER] Connecting to server...');
            
            try {
                this.serverWs = new WebSocket(this.config.serverUrl);
                
                this.serverWs.on('open', () => {
                    console.log('[ROUTER] Connected to server ✓');
                    this.sendToServer({
                        type: 'router_connected',
                        timestamp: Date.now(),
                        clientId: this.config.clientId
                    });
                    resolve();
                });
                
                this.serverWs.on('message', (data) => {
                    try {
                        const message = JSON.parse(data);
                        this.handleServerMessage(message);
                    } catch (error) {
                        console.error('[ROUTER] Invalid server message:', error.message);
                    }
                });
                
                this.serverWs.on('error', (error) => {
                    console.error('[ROUTER] Server connection error:', error.message);
                    reject(error);
                });
                
                this.serverWs.on('close', () => {
                    console.warn('[ROUTER] Server connection closed');
                    this.handleServerReconnection();
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    setupIBKRHandlers() {
        // Market data handler
        this.tws.on('tickPrice', (tickerId, field, price, canAutoExecute) => {
            const subscription = this.subscriptions.get(tickerId);
            if (subscription) {
                this.sendToServer({
                    type: 'market_data',
                    symbol: subscription.symbol,
                    field: field,
                    price: price,
                    timestamp: Date.now()
                });
            }
        });
        
        // Volume handler
        this.tws.on('tickSize', (tickerId, field, size) => {
            const subscription = this.subscriptions.get(tickerId);
            if (subscription) {
                this.sendToServer({
                    type: 'market_data',
                    symbol: subscription.symbol,
                    field: field,
                    size: size,
                    timestamp: Date.now()
                });
            }
        });
        
        // Contract details handler
        this.tws.on('contractDetails', (reqId, contractDetails) => {
            this.sendToServer({
                type: 'contract_details',
                requestId: reqId,
                contract: contractDetails,
                timestamp: Date.now()
            });
        });
        
        // Historical data handler
        this.tws.on('historicalData', (reqId, bar) => {
            this.sendToServer({
                type: 'historical_data',
                requestId: reqId,
                bar: bar,
                timestamp: Date.now()
            });
        });
        
        // Error handler
        this.tws.on('error', (id, errorCode, errorString) => {
            console.error(`[ROUTER] IBKR Error ${errorCode}: ${errorString}`);
            this.sendToServer({
                type: 'error',
                id: id,
                code: errorCode,
                message: errorString,
                timestamp: Date.now()
            });
        });
    }
    
    setupRouting() {
        // Handle heartbeat
        setInterval(() => {
            if (this.serverWs && this.serverWs.readyState === WebSocket.OPEN) {
                this.sendToServer({
                    type: 'heartbeat',
                    connected: this.connected,
                    subscriptions: this.subscriptions.size,
                    timestamp: Date.now()
                });
            }
        }, 30000);
    }
    
    handleServerMessage(message) {
        switch (message.type) {
            case 'subscribe_market_data':
                this.subscribeMarketData(message.symbols);
                break;
                
            case 'unsubscribe_market_data':
                this.unsubscribeMarketData(message.symbols);
                break;
                
            case 'request_contract_details':
                this.requestContractDetails(message.symbol);
                break;
                
            case 'request_historical_data':
                this.requestHistoricalData(message);
                break;
                
            case 'ping':
                this.sendToServer({ type: 'pong', timestamp: Date.now() });
                break;
                
            default:
                console.warn(`[ROUTER] Unknown message type: ${message.type}`);
        }
    }
    
    subscribeMarketData(symbols) {
        if (!this.connected || !this.tws) {
            console.warn('[ROUTER] Cannot subscribe - IBKR not connected');
            return;
        }
        
        symbols.forEach(symbol => {
            const tickerId = this.requestId++;
            const contract = {
                symbol: symbol,
                secType: 'STK',
                exchange: 'SMART',
                currency: 'USD'
            };
            
            try {
                reqMktData(this.tws, tickerId, contract, '', false, false);
                this.subscriptions.set(tickerId, { symbol, contract });
                console.log(`[ROUTER] Subscribed to market data: ${symbol} (ID: ${tickerId})`);
            } catch (error) {
                console.error(`[ROUTER] Failed to subscribe to ${symbol}:`, error.message);
            }
        });
    }
    
    unsubscribeMarketData(symbols) {
        symbols.forEach(symbol => {
            for (const [tickerId, subscription] of this.subscriptions) {
                if (subscription.symbol === symbol) {
                    try {
                        this.tws.cancelMktData(tickerId);
                        this.subscriptions.delete(tickerId);
                        console.log(`[ROUTER] Unsubscribed from market data: ${symbol}`);
                    } catch (error) {
                        console.error(`[ROUTER] Failed to unsubscribe from ${symbol}:`, error.message);
                    }
                    break;
                }
            }
        });
    }
    
    requestContractDetails(symbol) {
        if (!this.connected || !this.tws) return;
        
        const reqId = this.requestId++;
        const contract = {
            symbol: symbol,
            secType: 'STK',
            exchange: 'SMART',
            currency: 'USD'
        };
        
        try {
            reqContractDetails(this.tws, reqId, contract);
            console.log(`[ROUTER] Requested contract details: ${symbol}`);
        } catch (error) {
            console.error(`[ROUTER] Failed to request contract details for ${symbol}:`, error.message);
        }
    }
    
    requestHistoricalData(request) {
        if (!this.connected || !this.tws) return;
        
        const reqId = this.requestId++;
        const contract = {
            symbol: request.symbol,
            secType: 'STK',
            exchange: 'SMART',
            currency: 'USD'
        };
        
        try {
            reqHistoricalData(
                this.tws,
                reqId,
                contract,
                request.endDateTime || '',
                request.durationStr || '1 D',
                request.barSizeSetting || '1 min',
                request.whatToShow || 'TRADES',
                request.useRTH || 1,
                request.formatDate || 1
            );
            console.log(`[ROUTER] Requested historical data: ${request.symbol}`);
        } catch (error) {
            console.error(`[ROUTER] Failed to request historical data for ${request.symbol}:`, error.message);
        }
    }
    
    sendToServer(data) {
        if (this.serverWs && this.serverWs.readyState === WebSocket.OPEN) {
            try {
                this.serverWs.send(JSON.stringify(data));
            } catch (error) {
                console.error('[ROUTER] Failed to send to server:', error.message);
            }
        }
    }
    
    handleReconnection() {
        if (this.retryCount >= this.config.maxRetries) {
            console.error('[ROUTER] Max retry attempts reached for IBKR connection');
            return;
        }
        
        this.retryCount++;
        console.log(`[ROUTER] Attempting to reconnect to IBKR (${this.retryCount}/${this.config.maxRetries})...`);
        
        setTimeout(async () => {
            try {
                await this.connectToIBKR();
            } catch (error) {
                console.error('[ROUTER] Reconnection failed:', error.message);
                this.handleReconnection();
            }
        }, this.config.reconnectInterval);
    }
    
    handleServerReconnection() {
        setTimeout(async () => {
            try {
                await this.connectToServer();
            } catch (error) {
                console.error('[ROUTER] Server reconnection failed:', error.message);
                this.handleServerReconnection();
            }
        }, this.config.reconnectInterval);
    }
    
    handleError(error) {
        console.error('[ROUTER] Critical error:', error.message);
        process.exit(1);
    }
    
    async stop() {
        console.log('[ROUTER] Stopping router...');
        
        // Unsubscribe from all market data
        for (const tickerId of this.subscriptions.keys()) {
            try {
                this.tws.cancelMktData(tickerId);
            } catch (error) {
                console.error('[ROUTER] Error canceling market data:', error.message);
            }
        }
        
        // Close connections
        if (this.tws) {
            this.tws.disconnect();
        }
        
        if (this.serverWs) {
            this.serverWs.close();
        }
        
        console.log('[ROUTER] Router stopped');
    }
}

// CLI usage
if (require.main === module) {
    const router = new IBKRRouter();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n[ROUTER] Received SIGINT, shutting down gracefully...');
        await router.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n[ROUTER] Received SIGTERM, shutting down gracefully...');
        await router.stop();
        process.exit(0);
    });
    
    // Start router
    router.start().catch(error => {
        console.error('[ROUTER] Failed to start:', error.message);
        process.exit(1);
    });
}

module.exports = IBKRRouter;