# SFTi Stock Scanner - Installation and Server Architecture

This document describes the complete installation system and distributed server architecture for the SFTi Stock Scanner application.

## Architecture Overview

The system consists of three main components:

1. **Router Service** - Connects to IBKR TWS/Gateway and manages market data
2. **Server Service** - Public-facing API server that serves the web application
3. **Web Application** - React-based frontend that connects to the server

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   IBKR TWS/     │    │  Router Service │    │  Server Service │
│   Gateway       │◄──►│  (Port 8080)    │◄──►│  (Port 3000)    │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        ▲
                                                        │
                                               ┌─────────────────┐
                                               │  Web Clients    │
                                               │  (Browser/PWA)  │
                                               └─────────────────┘
```

## Installation

### Automatic Installation

The system includes cross-platform installation scripts that handle everything automatically.

#### Linux/macOS:
```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/sfti-scanner/main/scripts/install.sh | bash
```

Or download and run manually:
```bash
chmod +x install.sh
./install.sh
```

#### Windows:
Download and run `install.bat` as a regular user (not Administrator).

### Manual Installation

If you prefer manual installation:

1. **Install Dependencies:**
   - Node.js 18+ 
   - Python 3.8+ (optional, for advanced features)
   - Git

2. **Clone and Setup:**
   ```bash
   git clone <repository-url>
   cd sfti-scanner
   npm install
   ```

3. **Configure Services:**
   - Copy configuration templates from `scripts/` directory
   - Edit IBKR connection settings
   - Set up environment variables

## Configuration

### Router Service Configuration

File: `~/.sfti-scanner/config/router/.env`

```env
# IBKR Connection Settings
IBKR_HOST=127.0.0.1
IBKR_PORT=7497              # TWS: 7497, Gateway: 4001
IBKR_CLIENT_ID=1

# Router Settings
ROUTER_PORT=8080
ROUTER_HOST=0.0.0.0

# Server Connection
SERVER_HOST=localhost
SERVER_PORT=3000

# Data Settings
UPDATE_INTERVAL=3000        # Market data update interval (ms)
MARKET_DATA_CACHE_TTL=5000  # Cache timeout (ms)
```

### Server Service Configuration

File: `~/.sfti-scanner/config/server/.env`

```env
# Server Settings
SERVER_PORT=3000
WS_PORT=3001
SERVER_HOST=0.0.0.0

# Router Connection
ROUTER_HOST=localhost
ROUTER_PORT=8080

# Security
JWT_SECRET=your-jwt-secret-change-this
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW=60000     # 1 minute
RATE_LIMIT_MAX=1000         # Max requests per window

# Optional Redis Cache
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false
```

## Service Management

### Linux (systemd)

Services are automatically created and can be managed with:

```bash
# Start services
sudo systemctl start sfti-router
sudo systemctl start sfti-server

# Enable auto-start
sudo systemctl enable sfti-router
sudo systemctl enable sfti-server

# Check status
sudo systemctl status sfti-router
sudo systemctl status sfti-server

# View logs
sudo journalctl -f -u sfti-router
sudo journalctl -f -u sfti-server
```

### macOS (launchd)

Services are managed with launchctl:

```bash
# Load services
launchctl load ~/Library/LaunchAgents/com.sfti.router.plist
launchctl load ~/Library/LaunchAgents/com.sfti.server.plist

# Unload services
launchctl unload ~/Library/LaunchAgents/com.sfti.router.plist
launchctl unload ~/Library/LaunchAgents/com.sfti.server.plist

# Check status
launchctl list | grep sfti
```

### Windows

#### Manual Start/Stop:
```cmd
# Start services
%USERPROFILE%\.sfti-scanner\start.bat

# Stop services  
%USERPROFILE%\.sfti-scanner\stop.bat
```

#### Windows Service (requires NSSM):
1. Download NSSM from https://nssm.cc/
2. Extract `nssm.exe` to `%USERPROFILE%\.sfti-scanner\`
3. Run as Administrator: `install-service.bat`
4. Manage via `services.msc`

### Universal Scripts

All platforms include universal start/stop scripts:

```bash
# Start all services
~/.sfti-scanner/start.sh

# Stop all services
~/.sfti-scanner/stop.sh
```

## API Endpoints

### Market Data
- `GET /api/market-data` - Get all market data
- `GET /api/market-data/:symbol` - Get data for specific symbol
- `GET /api/market-data?symbols=AAPL,TSLA` - Get data for multiple symbols

### Scanner
- `POST /api/scan` - Run market scan with filters
- `GET /api/watchlist` - Get current watchlist
- `POST /api/watchlist` - Update watchlist

### Charts
- `GET /api/chart/:symbol?timeframe=1m&bars=100` - Get chart data

### News
- `GET /api/news?symbols=AAPL&limit=50` - Get news for symbols

### AI Features
- `POST /api/ai/search` - AI-powered stock search
- `GET /api/ai/insights` - Get market insights
- `GET /api/ai/top-picks` - Get AI top picks

### Alerts
- `GET /api/alerts` - Get all alerts
- `POST /api/alerts` - Create new alert
- `DELETE /api/alerts/:id` - Delete alert

### WebSocket Events

Connect to `ws://localhost:3001` for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'marketData':
      // Real-time market data updates
      break;
    case 'alert':
      // Alert notifications
      break;
    case 'news':
      // Breaking news
      break;
  }
};

// Subscribe to specific symbols
ws.send(JSON.stringify({
  type: 'subscribe',
  symbols: ['AAPL', 'TSLA', 'NVDA']
}));
```

## Security Features

- **Rate Limiting**: Prevents API abuse
- **CORS Protection**: Configurable origin restrictions
- **Helmet Security**: Security headers for web requests
- **Input Validation**: All API inputs are validated
- **Error Handling**: Secure error responses
- **WebSocket Authentication**: Optional authentication for WS connections

## Monitoring and Logging

### Health Checks
- Router: `http://localhost:8080/health`
- Server: `http://localhost:3000/health`

### Log Files
- Router: `~/.sfti-scanner/logs/router.log`
- Server: `~/.sfti-scanner/logs/server.log`
- Errors: `~/.sfti-scanner/logs/*-error.log`

### Monitoring Endpoints
```bash
# Check service status
curl http://localhost:8080/status
curl http://localhost:3000/health

# View real-time logs
tail -f ~/.sfti-scanner/logs/router.log
tail -f ~/.sfti-scanner/logs/server.log
```

## Firewall Configuration

The installation script automatically configures firewall rules for:
- Port 8080 (Router)
- Port 3000 (Server/Web Interface)  
- Port 3001 (WebSocket)

### Manual Firewall Setup

#### Linux (ufw):
```bash
sudo ufw allow 8080/tcp comment "SFTi Router"
sudo ufw allow 3000/tcp comment "SFTi Server"
sudo ufw allow 3001/tcp comment "SFTi WebSocket"
```

#### Windows:
```cmd
netsh advfirewall firewall add rule name="SFTi Router" dir=in action=allow protocol=TCP localport=8080
netsh advfirewall firewall add rule name="SFTi Server" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="SFTi WebSocket" dir=in action=allow protocol=TCP localport=3001
```

## Troubleshooting

### Common Issues

1. **IBKR Connection Failed**
   - Ensure TWS/Gateway is running
   - Check API settings in TWS/Gateway
   - Verify port numbers match configuration
   - Check firewall settings

2. **Services Won't Start**
   - Check Node.js installation
   - Verify configuration files exist
   - Check port conflicts
   - Review log files for errors

3. **Web Interface Not Loading**
   - Confirm server is running on port 3000
   - Check browser console for errors
   - Verify WebSocket connection to port 3001
   - Clear browser cache

4. **No Market Data**
   - Verify IBKR connection in router logs
   - Check if market is open
   - Confirm symbol subscriptions
   - Review IBKR account permissions

### Debug Mode

Enable debug logging by setting environment variables:
```bash
export LOG_LEVEL=debug
export NODE_ENV=development
```

### Reset Installation

To completely reset the installation:
```bash
# Stop services
~/.sfti-scanner/stop.sh

# Remove application directory
rm -rf ~/.sfti-scanner

# Remove system services (Linux)
sudo systemctl disable sfti-router sfti-server
sudo rm /etc/systemd/system/sfti-*.service

# Re-run installation
./install.sh
```

## Production Deployment

For production deployment, consider:

1. **Use Process Manager**: PM2, forever, or system services
2. **Reverse Proxy**: nginx or Apache for HTTPS
3. **Load Balancing**: Multiple server instances
4. **Database**: Redis for caching and session storage
5. **Monitoring**: Application performance monitoring
6. **Backups**: Regular configuration and data backups
7. **SSL/TLS**: HTTPS certificates for secure connections

### Example nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```