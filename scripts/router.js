const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const EventEmitter = require('events');
const ib = require('node-ib');
require('dotenv').config();

class IBKRRouter extends EventEmitter {
    constructor() {
        super();
        
        this.app = express();
        this.server = null;
        this.wss = null;
        this.ib = null;
        this.connected = false;
        this.subscriptions = new Set();
        this.marketData = new Map();
        this.alerts = new Map();
        this.watchlist = new Set();
        this.clients = new Set();
        this.requestHandlers = new Map();
        
        // Configuration
        this.config = {
            port: process.env.ROUTER_PORT || 8080,
            host: process.env.ROUTER_HOST || '0.0.0.0',
            ibkr: {
                host: process.env.IBKR_HOST || '127.0.0.1',
                port: parseInt(process.env.IBKR_PORT) || 7497,
                clientId: parseInt(process.env.IBKR_CLIENT_ID) || 1
            },
            updateInterval: parseInt(process.env.UPDATE_INTERVAL) || 3000,
            cacheTimeout: parseInt(process.env.MARKET_DATA_CACHE_TTL) || 5000
        };
        
        this.setupExpress();
        this.setupWebSocket();
        this.connectToIBKR();
        this.setupRequestHandlers();
        this.startDataUpdates();
    }
    
    setupExpress() {
        this.app.use(cors());
        this.app.use(express.json());
        
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                ibkrConnected: this.connected,
                subscriptions: this.subscriptions.size,
                clients: this.clients.size,
                timestamp: new Date().toISOString()
            });
        });
        
        // IBKR connection status
        this.app.get('/status', (req, res) => {
            res.json({
                connected: this.connected,
                subscriptions: Array.from(this.subscriptions),
                watchlist: Array.from(this.watchlist),
                marketDataCount: this.marketData.size,
                alertsCount: this.alerts.size
            });
        });
    }
    
    setupWebSocket() {
        this.wss = new WebSocket.Server({ 
            server: this.server,
            path: '/ws'
        });
        
        this.wss.on('connection', (ws, req) => {
            console.log(`Client connected from ${req.connection.remoteAddress}`);
            this.clients.add(ws);
            
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    await this.handleClientMessage(ws, data);
                } catch (error) {
                    console.error('WebSocket message error:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        error: error.message
                    }));
                }
            });
            
            ws.on('close', () => {
                console.log('Client disconnected');
                this.clients.delete(ws);
            });
            
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
    }
    
    async handleClientMessage(ws, data) {
        const { type, action, requestId } = data;
        
        try {
            let response;
            
            if (type === 'request' && this.requestHandlers.has(action)) {
                const handler = this.requestHandlers.get(action);
                response = await handler(data.data || {});
            } else {
                throw new Error(`Unknown action: ${action}`);
            }
            
            ws.send(JSON.stringify({
                type: 'response',
                requestId,
                data: response
            }));
            
        } catch (error) {
            ws.send(JSON.stringify({
                type: 'response',
                requestId,
                error: error.message
            }));
        }
    }
    
    setupRequestHandlers() {
        // Market data handlers
        this.requestHandlers.set('scan', this.handleScan.bind(this));
        this.requestHandlers.set('subscribe', this.handleSubscribe.bind(this));
        this.requestHandlers.set('unsubscribe', this.handleUnsubscribe.bind(this));
        this.requestHandlers.set('getMarketData', this.handleGetMarketData.bind(this));
        this.requestHandlers.set('getChartData', this.handleGetChartData.bind(this));
        
        // Watchlist handlers
        this.requestHandlers.set('getWatchlist', this.handleGetWatchlist.bind(this));
        this.requestHandlers.set('updateWatchlist', this.handleUpdateWatchlist.bind(this));
        
        // News handlers
        this.requestHandlers.set('getNews', this.handleGetNews.bind(this));
        
        // AI handlers
        this.requestHandlers.set('aiSearch', this.handleAISearch.bind(this));
        this.requestHandlers.set('getMarketInsights', this.handleGetMarketInsights.bind(this));
        this.requestHandlers.set('getTopPicks', this.handleGetTopPicks.bind(this));
        
        // Alert handlers
        this.requestHandlers.set('getAlerts', this.handleGetAlerts.bind(this));
        this.requestHandlers.set('createAlert', this.handleCreateAlert.bind(this));
        this.requestHandlers.set('deleteAlert', this.handleDeleteAlert.bind(this));
    }
    
    connectToIBKR() {
        console.log('Connecting to IBKR TWS/Gateway...');
        
        this.ib = new ib({
            host: this.config.ibkr.host,
            port: this.config.ibkr.port,
            clientId: this.config.ibkr.clientId
        });
        
        this.ib.on('connected', () => {
            console.log('Connected to IBKR');
            this.connected = true;
            this.emit('connected');
        });
        
        this.ib.on('disconnected', () => {
            console.log('Disconnected from IBKR');
            this.connected = false;
            this.emit('disconnected');
            
            // Attempt to reconnect
            setTimeout(() => {
                this.connectToIBKR();
            }, 5000);
        });
        
        this.ib.on('error', (error) => {
            console.error('IBKR error:', error);
            this.connected = false;
        });
        
        this.ib.on('tickPrice', (reqId, tickType, price, canAutoExecute) => {
            this.handleTickPrice(reqId, tickType, price);
        });
        
        this.ib.on('tickSize', (reqId, tickType, size) => {
            this.handleTickSize(reqId, tickType, size);
        });
        
        this.ib.on('tickGeneric', (reqId, tickType, value) => {
            this.handleTickGeneric(reqId, tickType, value);
        });
        
        this.ib.on('realtimeBar', (reqId, time, open, high, low, close, volume, wap, count) => {
            this.handleRealtimeBar(reqId, time, open, high, low, close, volume);
        });
        
        try {
            this.ib.connect();
        } catch (error) {
            console.error('Failed to connect to IBKR:', error);
            this.connected = false;
        }
    }
    
    handleTickPrice(reqId, tickType, price) {
        const symbol = this.getSymbolFromReqId(reqId);
        if (!symbol) return;
        
        if (!this.marketData.has(symbol)) {
            this.marketData.set(symbol, { symbol });
        }
        
        const data = this.marketData.get(symbol);
        
        switch (tickType) {
            case 1: // Bid price
                data.bid = price;
                break;
            case 2: // Ask price
                data.ask = price;
                break;
            case 4: // Last price
                data.price = price;
                data.lastUpdate = new Date();
                break;
            case 6: // High
                data.high = price;
                break;
            case 7: // Low
                data.low = price;
                break;
            case 9: // Close
                data.prevClose = price;
                if (data.price) {
                    data.change = data.price - price;
                    data.changePercent = ((data.change / price) * 100);
                }
                break;
        }
        
        this.marketData.set(symbol, data);
        this.broadcastMarketData(data);
    }
    
    handleTickSize(reqId, tickType, size) {
        const symbol = this.getSymbolFromReqId(reqId);
        if (!symbol) return;
        
        if (!this.marketData.has(symbol)) {
            this.marketData.set(symbol, { symbol });
        }
        
        const data = this.marketData.get(symbol);
        
        switch (tickType) {
            case 0: // Bid size
                data.bidSize = size;
                break;
            case 3: // Ask size
                data.askSize = size;
                break;
            case 5: // Last size
                data.lastSize = size;
                break;
            case 8: // Volume
                data.volume = size;
                break;
        }
        
        this.marketData.set(symbol, data);
    }
    
    handleTickGeneric(reqId, tickType, value) {
        const symbol = this.getSymbolFromReqId(reqId);
        if (!symbol) return;
        
        if (!this.marketData.has(symbol)) {
            this.marketData.set(symbol, { symbol });
        }
        
        const data = this.marketData.get(symbol);
        
        switch (tickType) {
            case 49: // Halted
                data.halted = value === 1;
                break;
            case 89: // Shortable shares
                data.shortableShares = value;
                break;
        }
        
        this.marketData.set(symbol, data);
    }
    
    handleRealtimeBar(reqId, time, open, high, low, close, volume) {
        const symbol = this.getSymbolFromReqId(reqId);
        if (!symbol) return;
        
        const barData = {
            symbol,
            timestamp: new Date(time * 1000),
            open,
            high,
            low,
            close,
            volume
        };
        
        this.broadcastRealtimeBar(barData);
    }
    
    getSymbolFromReqId(reqId) {
        // Implementation depends on how you map request IDs to symbols
        // This is a simplified version
        return Array.from(this.subscriptions)[reqId - 1];
    }
    
    broadcastMarketData(data) {
        const message = JSON.stringify({
            type: 'marketData',
            data
        });
        
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
    
    broadcastRealtimeBar(data) {
        const message = JSON.stringify({
            type: 'realtimeBar',
            data
        });
        
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
    
    // Request handlers
    async handleScan(filters) {
        if (!this.connected) {
            throw new Error('IBKR not connected');
        }
        
        // Implement IBKR scanner subscription
        const scannerSubscription = {
            numberOfRows: 50,
            instrument: 'STK',
            locationCode: 'STK.US',
            scanCode: 'TOP_PERC_GAIN'
        };
        
        // Apply filters
        if (filters.priceMin !== undefined) {
            scannerSubscription.abovePrice = filters.priceMin;
        }
        if (filters.priceMax !== undefined) {
            scannerSubscription.belowPrice = filters.priceMax;
        }
        if (filters.volumeMin !== undefined) {
            scannerSubscription.aboveVolume = filters.volumeMin;
        }
        
        return new Promise((resolve, reject) => {
            const reqId = Date.now();
            const timeout = setTimeout(() => {
                reject(new Error('Scan timeout'));
            }, 30000);
            
            const results = [];
            
            this.ib.on('scannerData', (reqId, rank, contract, distance, benchmark, projection, legsStr) => {
                results.push({
                    symbol: contract.symbol,
                    rank,
                    contract,
                    distance,
                    benchmark,
                    projection
                });
            });
            
            this.ib.on('scannerDataEnd', (reqId) => {
                clearTimeout(timeout);
                resolve(results);
            });
            
            this.ib.reqScannerSubscription(reqId, scannerSubscription, []);
        });
    }
    
    async handleSubscribe({ symbols }) {
        if (!this.connected) {
            throw new Error('IBKR not connected');
        }
        
        symbols.forEach((symbol, index) => {
            if (!this.subscriptions.has(symbol)) {
                const contract = {
                    symbol: symbol,
                    secType: 'STK',
                    exchange: 'SMART',
                    currency: 'USD'
                };
                
                const reqId = Date.now() + index;
                this.ib.reqMktData(reqId, contract, '', false, false, []);
                this.subscriptions.add(symbol);
            }
        });
        
        return { subscribed: symbols };
    }
    
    async handleUnsubscribe({ symbols }) {
        symbols.forEach(symbol => {
            if (this.subscriptions.has(symbol)) {
                // Find and cancel the subscription
                // This would require mapping symbols to request IDs
                this.subscriptions.delete(symbol);
                this.marketData.delete(symbol);
            }
        });
        
        return { unsubscribed: symbols };
    }
    
    async handleGetMarketData({ symbols }) {
        if (symbols && symbols.length > 0) {
            return symbols.map(symbol => this.marketData.get(symbol)).filter(Boolean);
        }
        return Array.from(this.marketData.values());
    }
    
    async handleGetChartData({ symbol, timeframe, bars }) {
        if (!this.connected) {
            throw new Error('IBKR not connected');
        }
        
        const contract = {
            symbol: symbol,
            secType: 'STK',
            exchange: 'SMART',
            currency: 'USD'
        };
        
        return new Promise((resolve, reject) => {
            const reqId = Date.now();
            const timeout = setTimeout(() => {
                reject(new Error('Chart data timeout'));
            }, 30000);
            
            const chartData = [];
            
            this.ib.on('historicalData', (reqId, time, open, high, low, close, volume, count, wap, hasGaps) => {
                if (time.startsWith('finished')) {
                    clearTimeout(timeout);
                    resolve(chartData);
                } else {
                    chartData.push({
                        timestamp: new Date(time * 1000),
                        open,
                        high,
                        low,
                        close,
                        volume
                    });
                }
            });
            
            const endDateTime = '';
            const durationStr = `${bars} S`;
            const barSizeSetting = timeframe;
            const whatToShow = 'TRADES';
            const useRTH = 1;
            const formatDate = 1;
            
            this.ib.reqHistoricalData(
                reqId, contract, endDateTime, durationStr,
                barSizeSetting, whatToShow, useRTH, formatDate, false, []
            );
        });
    }
    
    async handleGetWatchlist() {
        return Array.from(this.watchlist);
    }
    
    async handleUpdateWatchlist({ symbols }) {
        this.watchlist.clear();
        symbols.forEach(symbol => this.watchlist.add(symbol));
        return { watchlist: Array.from(this.watchlist) };
    }
    
    async handleGetNews({ symbols, limit }) {
        if (!this.connected) {
            throw new Error('IBKR not connected');
        }
        
        // IBKR news implementation would go here
        // For now, return mock data
        return [];
    }
    
    async handleAISearch({ query }) {
        // This would integrate with your AI service
        // For now, return mock results
        return {
            suggestions: [`Search results for: ${query}`],
            insights: [`AI insights for: ${query}`]
        };
    }
    
    async handleGetMarketInsights() {
        // Generate market insights based on current data
        const stocks = Array.from(this.marketData.values());
        
        return {
            topGainers: stocks
                .filter(s => s.changePercent > 0)
                .sort((a, b) => b.changePercent - a.changePercent)
                .slice(0, 5),
            topLosers: stocks
                .filter(s => s.changePercent < 0)
                .sort((a, b) => a.changePercent - b.changePercent)
                .slice(0, 5),
            highVolume: stocks
                .filter(s => s.volume)
                .sort((a, b) => b.volume - a.volume)
                .slice(0, 5),
            lastUpdate: new Date().toISOString()
        };
    }
    
    async handleGetTopPicks() {
        // AI-generated top picks based on market analysis
        const stocks = Array.from(this.marketData.values());
        
        return stocks
            .filter(s => s.price && s.volume && s.changePercent)
            .sort((a, b) => {
                // Simple scoring algorithm
                const scoreA = (a.changePercent * 0.4) + (Math.log(a.volume) * 0.6);
                const scoreB = (b.changePercent * 0.4) + (Math.log(b.volume) * 0.6);
                return scoreB - scoreA;
            })
            .slice(0, 10)
            .map((stock, index) => ({
                ...stock,
                rank: index + 1,
                aiScore: Math.random() * 100 // Mock AI score
            }));
    }
    
    async handleGetAlerts() {
        return Array.from(this.alerts.values());
    }
    
    async handleCreateAlert(alert) {
        const alertId = Date.now().toString();
        const alertData = {
            ...alert,
            id: alertId,
            created: new Date().toISOString(),
            triggered: false
        };
        
        this.alerts.set(alertId, alertData);
        return alertData;
    }
    
    async handleDeleteAlert({ id }) {
        const deleted = this.alerts.delete(id);
        return { deleted, id };
    }
    
    startDataUpdates() {
        setInterval(() => {
            this.checkAlerts();
        }, this.config.updateInterval);
    }
    
    checkAlerts() {
        this.alerts.forEach(alert => {
            if (alert.triggered) return;
            
            const stock = this.marketData.get(alert.symbol);
            if (!stock) return;
            
            let triggered = false;
            
            switch (alert.type) {
                case 'price':
                    if (alert.condition === 'above' && stock.price >= alert.value) {
                        triggered = true;
                    } else if (alert.condition === 'below' && stock.price <= alert.value) {
                        triggered = true;
                    }
                    break;
                    
                case 'volume':
                    if (stock.volume >= alert.value) {
                        triggered = true;
                    }
                    break;
                    
                case 'change':
                    if (Math.abs(stock.changePercent) >= alert.value) {
                        triggered = true;
                    }
                    break;
            }
            
            if (triggered) {
                alert.triggered = true;
                alert.triggeredAt = new Date().toISOString();
                
                const alertMessage = {
                    type: 'alert',
                    data: {
                        ...alert,
                        currentPrice: stock.price,
                        currentVolume: stock.volume,
                        currentChange: stock.changePercent
                    }
                };
                
                this.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(alertMessage));
                    }
                });
            }
        });
    }
    
    start() {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
            console.log(`IBKR Router listening on http://${this.config.host}:${this.config.port}`);
            console.log(`WebSocket endpoint: ws://${this.config.host}:${this.config.port}/ws`);
        });
        
        // Set up WebSocket server with the HTTP server
        this.wss.options.server = this.server;
        
        // Graceful shutdown
        process.on('SIGTERM', this.shutdown.bind(this));
        process.on('SIGINT', this.shutdown.bind(this));
    }
    
    shutdown() {
        console.log('Shutting down router...');
        
        if (this.ib && this.connected) {
            this.ib.disconnect();
        }
        
        if (this.wss) {
            this.wss.close();
        }
        
        if (this.server) {
            this.server.close(() => {
                console.log('Router shut down complete');
                process.exit(0);
            });
        }
    }
}

// Start the router
if (require.main === module) {
    const router = new IBKRRouter();
    router.start();
}

module.exports = IBKRRouter;