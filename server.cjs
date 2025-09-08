#!/usr/bin/env node

/**
 * SFTi Stock Scanner - Public Facing Server
 * Receives data from IBKR router and serves to web clients
 */

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

class SFTiServer {
    constructor(options = {}) {
        this.config = {
            port: parseInt(options.port) || parseInt(process.env.PORT) || 3001,
            wsPort: parseInt(options.wsPort) || parseInt(process.env.WS_PORT) || 3002,
            host: options.host || process.env.HOST || '0.0.0.0',
            corsOrigins: options.corsOrigins || process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
            rateLimit: {
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 1000 // limit each IP to 1000 requests per windowMs
            }
        };
        
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ port: this.config.wsPort });
        
        this.clients = new Set();
        this.routerConnection = null;
        this.marketData = new Map();
        this.contractData = new Map();
        this.historicalData = new Map();
        this.alerts = new Map();
        
        console.log(`[SERVER] Initializing SFTi Server`);
        console.log(`[SERVER] HTTP: ${this.config.host}:${this.config.port}`);
        console.log(`[SERVER] WebSocket: ${this.config.host}:${this.config.wsPort}`);
        console.log(`[SERVER] CORS Origins: ${this.config.corsOrigins.join(', ')}`);
    }
    
    async start() {
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.startServices();
        
        console.log('[SERVER] Server started successfully');
        console.log(`[SERVER] HTTP API: http://${this.config.host}:${this.config.port}`);
        console.log(`[SERVER] WebSocket: ws://${this.config.host}:${this.config.wsPort}`);
    }
    
    setupMiddleware() {
        // Security and performance middleware
        this.app.use(compression());
        this.app.use(cors({
            origin: this.config.corsOrigins,
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        
        // Rate limiting
        const limiter = rateLimit(this.config.rateLimit);
        this.app.use('/api/', limiter);
        
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`[SERVER] ${req.method} ${req.path} - ${req.ip}`);
            next();
        });
    }
    
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: Date.now(),
                router_connected: !!this.routerConnection,
                active_clients: this.clients.size,
                market_data_symbols: this.marketData.size
            });
        });
        
        // API Routes
        this.app.get('/api/market-data', (req, res) => {
            const symbols = req.query.symbols?.split(',') || [];
            const data = {};
            
            symbols.forEach(symbol => {
                if (this.marketData.has(symbol)) {
                    data[symbol] = this.marketData.get(symbol);
                }
            });
            
            res.json({ data, timestamp: Date.now() });
        });
        
        this.app.get('/api/market-data/:symbol', (req, res) => {
            const symbol = req.params.symbol.toUpperCase();
            const data = this.marketData.get(symbol);
            
            if (data) {
                res.json({ symbol, data, timestamp: Date.now() });
            } else {
                res.status(404).json({ error: 'Symbol not found', symbol });
            }
        });
        
        this.app.get('/api/contract/:symbol', (req, res) => {
            const symbol = req.params.symbol.toUpperCase();
            const contract = this.contractData.get(symbol);
            
            if (contract) {
                res.json({ symbol, contract, timestamp: Date.now() });
            } else {
                res.status(404).json({ error: 'Contract not found', symbol });
            }
        });
        
        this.app.get('/api/historical/:symbol', (req, res) => {
            const symbol = req.params.symbol.toUpperCase();
            const data = this.historicalData.get(symbol);
            
            if (data) {
                res.json({ symbol, data, timestamp: Date.now() });
            } else {
                res.status(404).json({ error: 'Historical data not found', symbol });
            }
        });
        
        // Request market data subscription
        this.app.post('/api/subscribe', (req, res) => {
            const { symbols } = req.body;
            
            if (!symbols || !Array.isArray(symbols)) {
                return res.status(400).json({ error: 'Invalid symbols array' });
            }
            
            this.requestMarketData(symbols);
            res.json({ message: 'Subscription requested', symbols });
        });
        
        // Alert management
        this.app.get('/api/alerts', (req, res) => {
            const alerts = Array.from(this.alerts.values());
            res.json({ alerts, count: alerts.length });
        });
        
        this.app.post('/api/alerts', (req, res) => {
            const alert = {
                id: Date.now().toString(),
                ...req.body,
                created: Date.now(),
                triggered: false
            };
            
            this.alerts.set(alert.id, alert);
            res.json({ message: 'Alert created', alert });
        });
        
        this.app.delete('/api/alerts/:id', (req, res) => {
            const { id } = req.params;
            
            if (this.alerts.delete(id)) {
                res.json({ message: 'Alert deleted', id });
            } else {
                res.status(404).json({ error: 'Alert not found', id });
            }
        });
        
        // Statistics
        this.app.get('/api/stats', (req, res) => {
            res.json({
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                clients: this.clients.size,
                market_data_symbols: this.marketData.size,
                contracts: this.contractData.size,
                historical_data: this.historicalData.size,
                alerts: this.alerts.size,
                router_connected: !!this.routerConnection
            });
        });
        
        // Error handling
        this.app.use((err, req, res, next) => {
            console.error('[SERVER] Error:', err.message);
            res.status(500).json({ error: 'Internal server error' });
        });
        
        this.app.use((req, res) => {
            res.status(404).json({ error: 'Endpoint not found' });
        });
    }
    
    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            console.log(`[SERVER] New client connected: ${req.socket.remoteAddress}`);
            this.clients.add(ws);
            
            // Send initial data
            ws.send(JSON.stringify({
                type: 'connected',
                timestamp: Date.now(),
                market_data_count: this.marketData.size
            }));
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleClientMessage(ws, message);
                } catch (error) {
                    console.error('[SERVER] Invalid client message:', error.message);
                }
            });
            
            ws.on('close', () => {
                console.log('[SERVER] Client disconnected');
                this.clients.delete(ws);
            });
            
            ws.on('error', (error) => {
                console.error('[SERVER] WebSocket error:', error.message);
                this.clients.delete(ws);
            });
        });
        
        // Router connection handling
        this.wss.on('connection', (ws, req) => {
            // Check if this is a router connection
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    if (message.type === 'router_connected') {
                        console.log('[SERVER] Router connected');
                        this.routerConnection = ws;
                        this.setupRouterHandlers(ws);
                    }
                } catch (error) {
                    // Ignore invalid messages
                }
            });
        });
    }
    
    setupRouterHandlers(ws) {
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                this.handleRouterMessage(message);
            } catch (error) {
                console.error('[SERVER] Invalid router message:', error.message);
            }
        });
        
        ws.on('close', () => {
            console.warn('[SERVER] Router disconnected');
            this.routerConnection = null;
        });
        
        ws.on('error', (error) => {
            console.error('[SERVER] Router connection error:', error.message);
            this.routerConnection = null;
        });
    }
    
    handleClientMessage(ws, message) {
        switch (message.type) {
            case 'subscribe':
                this.requestMarketData(message.symbols);
                break;
                
            case 'unsubscribe':
                this.unsubscribeMarketData(message.symbols);
                break;
                
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                break;
                
            default:
                console.warn(`[SERVER] Unknown client message type: ${message.type}`);
        }
    }
    
    handleRouterMessage(message) {
        switch (message.type) {
            case 'market_data':
                this.updateMarketData(message);
                break;
                
            case 'contract_details':
                this.updateContractData(message);
                break;
                
            case 'historical_data':
                this.updateHistoricalData(message);
                break;
                
            case 'error':
                console.error(`[SERVER] IBKR Error: ${message.message}`);
                this.broadcastToClients({ type: 'error', ...message });
                break;
                
            case 'heartbeat':
                // Router is alive
                break;
                
            default:
                console.warn(`[SERVER] Unknown router message type: ${message.type}`);
        }
    }
    
    updateMarketData(message) {
        const { symbol, field, price, size } = message;
        
        if (!this.marketData.has(symbol)) {
            this.marketData.set(symbol, {
                symbol,
                price: null,
                volume: null,
                bid: null,
                ask: null,
                last_update: Date.now()
            });
        }
        
        const data = this.marketData.get(symbol);
        
        // Update based on field type (IBKR field codes)
        switch (field) {
            case 1: // Bid price
                data.bid = price;
                break;
            case 2: // Ask price
                data.ask = price;
                break;
            case 4: // Last price
                data.price = price;
                break;
            case 8: // Volume
                data.volume = size;
                break;
        }
        
        data.last_update = message.timestamp;
        this.marketData.set(symbol, data);
        
        // Check alerts
        this.checkAlerts(symbol, data);
        
        // Broadcast to clients
        this.broadcastToClients({
            type: 'market_data_update',
            symbol,
            data,
            timestamp: message.timestamp
        });
    }
    
    updateContractData(message) {
        const { contract } = message;
        if (contract && contract.symbol) {
            this.contractData.set(contract.symbol, contract);
            
            this.broadcastToClients({
                type: 'contract_update',
                symbol: contract.symbol,
                contract,
                timestamp: message.timestamp
            });
        }
    }
    
    updateHistoricalData(message) {
        const { requestId, bar } = message;
        
        // Store historical data by request ID for now
        // In production, you'd map this back to symbols
        if (!this.historicalData.has(requestId)) {
            this.historicalData.set(requestId, []);
        }
        
        const data = this.historicalData.get(requestId);
        data.push(bar);
        
        this.broadcastToClients({
            type: 'historical_data_update',
            requestId,
            bar,
            timestamp: message.timestamp
        });
    }
    
    checkAlerts(symbol, data) {
        for (const [id, alert] of this.alerts) {
            if (alert.symbol === symbol && !alert.triggered) {
                const triggered = this.evaluateAlert(alert, data);
                
                if (triggered) {
                    alert.triggered = true;
                    alert.triggered_at = Date.now();
                    
                    this.broadcastToClients({
                        type: 'alert_triggered',
                        alert,
                        symbol,
                        data,
                        timestamp: Date.now()
                    });
                    
                    console.log(`[SERVER] Alert triggered: ${alert.name} for ${symbol}`);
                }
            }
        }
    }
    
    evaluateAlert(alert, data) {
        switch (alert.type) {
            case 'price_above':
                return data.price >= alert.threshold;
            case 'price_below':
                return data.price <= alert.threshold;
            case 'volume_above':
                return data.volume >= alert.threshold;
            default:
                return false;
        }
    }
    
    requestMarketData(symbols) {
        if (this.routerConnection) {
            this.routerConnection.send(JSON.stringify({
                type: 'subscribe_market_data',
                symbols,
                timestamp: Date.now()
            }));
        } else {
            console.warn('[SERVER] Cannot request market data - router not connected');
        }
    }
    
    unsubscribeMarketData(symbols) {
        if (this.routerConnection) {
            this.routerConnection.send(JSON.stringify({
                type: 'unsubscribe_market_data',
                symbols,
                timestamp: Date.now()
            }));
        }
    }
    
    broadcastToClients(message) {
        const data = JSON.stringify(message);
        
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(data);
                } catch (error) {
                    console.error('[SERVER] Failed to send to client:', error.message);
                    this.clients.delete(client);
                }
            }
        });
    }
    
    startServices() {
        // Start HTTP server
        this.server.listen(this.config.port, this.config.host, () => {
            console.log(`[SERVER] HTTP server listening on ${this.config.host}:${this.config.port}`);
        });
        
        // Health check interval
        setInterval(() => {
            console.log(`[SERVER] Health: ${this.clients.size} clients, ${this.marketData.size} symbols, router: ${!!this.routerConnection}`);
        }, 60000);
        
        // Cleanup old data
        setInterval(() => {
            this.cleanupOldData();
        }, 300000); // 5 minutes
    }
    
    cleanupOldData() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        // Clean up old market data
        for (const [symbol, data] of this.marketData) {
            if (now - data.last_update > maxAge) {
                this.marketData.delete(symbol);
                console.log(`[SERVER] Cleaned up old data for ${symbol}`);
            }
        }
        
        // Clean up triggered alerts
        for (const [id, alert] of this.alerts) {
            if (alert.triggered && now - alert.triggered_at > maxAge) {
                this.alerts.delete(id);
                console.log(`[SERVER] Cleaned up old alert ${id}`);
            }
        }
    }
    
    async stop() {
        console.log('[SERVER] Stopping server...');
        
        // Close all client connections
        this.clients.forEach(client => {
            client.close();
        });
        
        // Close WebSocket server
        this.wss.close();
        
        // Close HTTP server
        this.server.close();
        
        console.log('[SERVER] Server stopped');
    }
}

// CLI usage
if (require.main === module) {
    const server = new SFTiServer();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n[SERVER] Received SIGINT, shutting down gracefully...');
        await server.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n[SERVER] Received SIGTERM, shutting down gracefully...');
        await server.stop();
        process.exit(0);
    });
    
    // Start server
    server.start().catch(error => {
        console.error('[SERVER] Failed to start:', error.message);
        process.exit(1);
    });
}

module.exports = SFTiServer;