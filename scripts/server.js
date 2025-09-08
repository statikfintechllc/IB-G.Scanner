import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { RateLimiterMemory } from 'rate-limiter-flexible';
// Import axios (make sure it's installed)
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

class SFTiServer {
    constructor() {
        this.app = express();
        this.server = null;
        this.wss = null;
        this.clients = new Set();
        this.routerConnected = false;
        this.routerSocket = null;
        this.marketData = new Map();
        this.lastUpdate = new Date();
        
        // Configuration
        this.config = {
            port: process.env.SERVER_PORT || 3000,
            wsPort: process.env.WS_PORT || 3001,
            host: process.env.SERVER_HOST || '0.0.0.0',
            routerHost: process.env.ROUTER_HOST || 'localhost',
            routerPort: process.env.ROUTER_PORT || 8080,
            corsOrigin: process.env.CORS_ORIGIN || '*',
            rateLimit: {
                window: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
                max: parseInt(process.env.RATE_LIMIT_MAX) || 1000
            }
        };
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.connectToRouter();
    }
    
    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    scriptSrc: ["'self'", "'unsafe-eval'"],
                    connectSrc: ["'self'", `ws://localhost:${this.config.wsPort}`, `wss://localhost:${this.config.wsPort}`],
                    imgSrc: ["'self'", "data:", "https:"]
                }
            }
        }));
        
        // CORS
        this.app.use(cors({
            origin: this.config.corsOrigin,
            credentials: true
        }));
        
        // Compression
        this.app.use(compression());
        
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // Rate limiting
    const rateLimiter = new RateLimiterMemory({
            keyGenerator: (req) => req.ip,
            points: this.config.rateLimit.max,
            duration: this.config.rateLimit.window / 1000
        });
        
        this.app.use(async (req, res, next) => {
            try {
                await rateLimiter.consume(req.ip);
                next();
            } catch (rejRes) {
                const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
                res.set('Retry-After', String(secs));
                res.status(429).json({
                    error: 'Rate limit exceeded',
                    retryAfter: secs
                });
            }
        });
        
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
            next();
        });
    }
    
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                routerConnected: this.routerConnected,
                activeClients: this.clients.size,
                marketDataAge: Date.now() - this.lastUpdate.getTime()
            });
        });
        
        // Market data endpoints
        this.app.get('/api/market-data', (req, res) => {
            const symbols = req.query.symbols ? req.query.symbols.split(',') : [];
            
            if (symbols.length === 0) {
                return res.json(Array.from(this.marketData.values()));
            }
            
            const data = symbols.map(symbol => this.marketData.get(symbol)).filter(Boolean);
            res.json(data);
        });
        
        this.app.get('/api/market-data/:symbol', (req, res) => {
            const { symbol } = req.params;
            const data = this.marketData.get(symbol.toUpperCase());
            
            if (!data) {
                return res.status(404).json({ error: 'Symbol not found' });
            }
            
            res.json(data);
        });
        
        // Scanner endpoints
        this.app.post('/api/scan', async (req, res) => {
            try {
                const filters = req.body;
                const response = await this.requestFromRouter('scan', filters);
                res.json(response);
            } catch (error) {
                console.error('Scan request failed:', error);
                res.status(500).json({ error: 'Scan request failed' });
            }
        });
        
        // Watchlist endpoints
        this.app.get('/api/watchlist', async (req, res) => {
            try {
                const response = await this.requestFromRouter('getWatchlist');
                res.json(response);
            } catch (error) {
                console.error('Watchlist request failed:', error);
                res.status(500).json({ error: 'Watchlist request failed' });
            }
        });
        
        this.app.post('/api/watchlist', async (req, res) => {
            try {
                const { symbols } = req.body;
                const response = await this.requestFromRouter('updateWatchlist', { symbols });
                res.json(response);
            } catch (error) {
                console.error('Watchlist update failed:', error);
                res.status(500).json({ error: 'Watchlist update failed' });
            }
        });
        
        // Chart data endpoints
        this.app.get('/api/chart/:symbol', async (req, res) => {
            try {
                const { symbol } = req.params;
                const { timeframe = '1m', bars = 100 } = req.query;
                
                const response = await this.requestFromRouter('getChartData', {
                    symbol: symbol.toUpperCase(),
                    timeframe,
                    bars: parseInt(bars)
                });
                
                res.json(response);
            } catch (error) {
                console.error('Chart data request failed:', error);
                res.status(500).json({ error: 'Chart data request failed' });
            }
        });
        
        // News endpoints
        this.app.get('/api/news', async (req, res) => {
            try {
                const { symbols, limit = 50 } = req.query;
                const symbolList = symbols ? symbols.split(',') : [];
                
                const response = await this.requestFromRouter('getNews', {
                    symbols: symbolList,
                    limit: parseInt(limit)
                });
                
                res.json(response);
            } catch (error) {
                console.error('News request failed:', error);
                res.status(500).json({ error: 'News request failed' });
            }
        });
        
        // AI endpoints
        this.app.post('/api/ai/search', async (req, res) => {
            try {
                const { query } = req.body;
                const response = await this.requestFromRouter('aiSearch', { query });
                res.json(response);
            } catch (error) {
                console.error('AI search failed:', error);
                res.status(500).json({ error: 'AI search failed' });
            }
        });
        
        this.app.get('/api/ai/insights', async (req, res) => {
            try {
                const response = await this.requestFromRouter('getMarketInsights');
                res.json(response);
            } catch (error) {
                console.error('Market insights request failed:', error);
                res.status(500).json({ error: 'Market insights request failed' });
            }
        });
        
        this.app.get('/api/ai/top-picks', async (req, res) => {
            try {
                const response = await this.requestFromRouter('getTopPicks');
                res.json(response);
            } catch (error) {
                console.error('Top picks request failed:', error);
                res.status(500).json({ error: 'Top picks request failed' });
            }
        });
        
        // Alert endpoints
        this.app.get('/api/alerts', async (req, res) => {
            try {
                const response = await this.requestFromRouter('getAlerts');
                res.json(response);
            } catch (error) {
                console.error('Alerts request failed:', error);
                res.status(500).json({ error: 'Alerts request failed' });
            }
        });
        
        this.app.post('/api/alerts', async (req, res) => {
            try {
                const alert = req.body;
                const response = await this.requestFromRouter('createAlert', alert);
                res.json(response);
            } catch (error) {
                console.error('Alert creation failed:', error);
                res.status(500).json({ error: 'Alert creation failed' });
            }
        });
        
        this.app.delete('/api/alerts/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const response = await this.requestFromRouter('deleteAlert', { id });
                res.json(response);
            } catch (error) {
                console.error('Alert deletion failed:', error);
                res.status(500).json({ error: 'Alert deletion failed' });
            }
        });
        
        // Serve static files (the web app)
        this.app.use(express.static('public'));
        
        // Fallback for SPA
        // Use a catch-all middleware for SPA fallback
        this.app.use((req, res) => {
            res.sendFile('index.html', { root: 'public' });
        });
        
        // Error handling
        this.app.use((error, req, res, next) => {
            console.error('Server error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        });
    }
    
    setupWebSocket() {
        this.wss = new WebSocketServer({ 
            port: this.config.wsPort,
            host: this.config.host
        });
        
        this.wss.on('connection', (ws, req) => {
            console.log(`WebSocket client connected from ${req.connection.remoteAddress}`);
            this.clients.add(ws);
            
            // Send current market data to new client
            ws.send(JSON.stringify({
                type: 'marketData',
                data: Array.from(this.marketData.values()),
                timestamp: this.lastUpdate.toISOString()
            }));
            
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    
                    switch (data.type) {
                        case 'subscribe':
                            // Handle subscription to specific symbols
                            await this.handleSubscription(ws, data.symbols);
                            break;
                            
                        case 'unsubscribe':
                            // Handle unsubscription
                            await this.handleUnsubscription(ws, data.symbols);
                            break;
                            
                        case 'ping':
                            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                            break;
                    }
                } catch (error) {
                    console.error('WebSocket message error:', error);
                }
            });
            
            ws.on('close', () => {
                console.log('WebSocket client disconnected');
                this.clients.delete(ws);
            });
            
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
        
        console.log(`WebSocket server listening on ${this.config.host}:${this.config.wsPort}`);
    }
    
    async handleSubscription(ws, symbols) {
        try {
            await this.requestFromRouter('subscribe', { symbols });
            ws.send(JSON.stringify({
                type: 'subscribed',
                symbols,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Subscription failed:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Subscription failed',
                timestamp: Date.now()
            }));
        }
    }
    
    async handleUnsubscription(ws, symbols) {
        try {
            await this.requestFromRouter('unsubscribe', { symbols });
            ws.send(JSON.stringify({
                type: 'unsubscribed',
                symbols,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Unsubscription failed:', error);
        }
    }
    
    connectToRouter() {
        const routerUrl = `ws://${this.config.routerHost}:${this.config.routerPort}/ws`;
        
        console.log(`Connecting to router at ${routerUrl}`);
        
        this.routerSocket = new WebSocket(routerUrl);
        
        this.routerSocket.on('open', () => {
            console.log('Connected to router');
            this.routerConnected = true;
            
            // Send authentication if needed
            this.routerSocket.send(JSON.stringify({
                type: 'auth',
                clientType: 'server'
            }));
        });
        
        this.routerSocket.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                this.handleRouterMessage(message);
            } catch (error) {
                console.error('Router message parse error:', error);
            }
        });
        
        this.routerSocket.on('close', () => {
            console.log('Router connection closed, attempting to reconnect...');
            this.routerConnected = false;
            
            setTimeout(() => {
                this.connectToRouter();
            }, 5000);
        });
        
        this.routerSocket.on('error', (error) => {
            console.error('Router connection error:', error);
            this.routerConnected = false;
        });
    }
    
    handleRouterMessage(message) {
        switch (message.type) {
            case 'marketData':
                this.updateMarketData(message.data);
                break;
            case 'alert':
                this.broadcastAlert(message.data);
                break;
            case 'news':
                this.broadcastNews(message.data);
                break;
            case 'error':
                console.error('Router error:', message.error);
                break;
            case 'response':
                console.log('Router response:', message);
                break;
            default:
                console.log('Unknown router message type:', message.type);
        }
    }
    
    updateMarketData(data) {
        if (Array.isArray(data)) {
            data.forEach(stock => {
                this.marketData.set(stock.symbol, stock);
            });
        } else {
            this.marketData.set(data.symbol, data);
        }
        
        this.lastUpdate = new Date();
        
        // Broadcast to all WebSocket clients
        this.broadcast({
            type: 'marketData',
            data: Array.isArray(data) ? data : [data],
            timestamp: this.lastUpdate.toISOString()
        });
    }
    
    broadcastAlert(alert) {
        this.broadcast({
            type: 'alert',
            data: alert,
            timestamp: new Date().toISOString()
        });
    }
    
    broadcastNews(news) {
        this.broadcast({
            type: 'news',
            data: news,
            timestamp: new Date().toISOString()
        });
    }
    
    broadcast(message) {
        const messageStr = JSON.stringify(message);
        
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(messageStr);
                } catch (error) {
                    console.error('Broadcast error:', error);
                    this.clients.delete(client);
                }
            }
        });
    }
    
    async requestFromRouter(action, data = {}) {
        return new Promise((resolve, reject) => {
            if (!this.routerConnected || !this.routerSocket) {
                reject(new Error('Router not connected'));
                return;
            }
            
            const requestId = Date.now().toString();
            const timeout = setTimeout(() => {
                reject(new Error('Request timeout'));
            }, 10000);
            
            const handleResponse = (message) => {
                const response = JSON.parse(message);
                if (response.requestId === requestId) {
                    clearTimeout(timeout);
                    this.routerSocket.off('message', handleResponse);
                    
                    if (response.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve(response.data);
                    }
                }
            };
            
            this.routerSocket.on('message', handleResponse);
            
            this.routerSocket.send(JSON.stringify({
                type: 'request',
                action,
                data,
                requestId
            }));
        });
    }
    
    start() {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
            console.log(`SFTi Server listening on http://${this.config.host}:${this.config.port}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`CORS Origin: ${this.config.corsOrigin}`);
        });
        
        // Graceful shutdown
        process.on('SIGTERM', this.shutdown.bind(this));
        process.on('SIGINT', this.shutdown.bind(this));
    }
    
    shutdown() {
        console.log('Shutting down server...');
        
        if (this.routerSocket) {
            this.routerSocket.close();
        }
        
        if (this.wss) {
            this.wss.close();
        }
        
        if (this.server) {
            this.server.close(() => {
                console.log('Server shut down complete');
                process.exit(0);
            });
        }
    }
}

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new SFTiServer();
    server.start();
}

export default SFTiServer;