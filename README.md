# 📈 SFTi Stock Scanner

A professional, real-time penny stock scanner with Interactive Brokers (IBKR) integration, featuring AI-powered analysis, pattern recognition, and comprehensive market insights.

## 🌟 Features

- **Real-time Market Data**: Live IBKR integration for accurate penny stock scanning
- **AI-Powered Analysis**: Smart stock recommendations and pattern recognition
- **Advanced Filtering**: Price, volume, market cap, and float-based filtering
- **Interactive Charts**: Professional candlestick charts with technical indicators
- **Price Alerts**: Real-time notifications for breakout patterns
- **Market Hours Detection**: Dynamic themes based on trading sessions
- **Multi-Tab Interface**: Analyze multiple stocks simultaneously
- **Dark Professional Theme**: Bloomberg Terminal-inspired interface

## 🏗️ Architecture

The SFTi Stock Scanner uses a three-tier architecture for reliable data delivery:

```txt
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  IBKR TWS/      │    │  Router Service │    │  Public Server  │
│  Gateway        │◄───┤  (router.js)    │◄───┤  (server.js)    │
│  (Data Source)  │    │  Local Bridge   │    │  Web API/WS     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       ▲
                                               ┌─────────────────┐
                                               │  Web Client     │
                                               │  (React App)    │
                                               └─────────────────┘
```

### Components

1. **IBKR TWS/Gateway**: Interactive Brokers' trading platform providing real-time market data
2. **Router Service**: Local Node.js service that connects to IBKR and forwards data
3. **Public Server**: Web server that receives data from router and serves to clients
4. **Web Client**: React-based frontend with real-time charts and scanning interface

## 🚀 Installation Methods

### Method 1: Automatic Installation (Recommended)

```bash
# Download and run the universal installer
curl -sSL https://raw.githubusercontent.com/your-repo/sfti-stock-scanner/main/install.sh | bash

# Or with wget
wget -qO- https://raw.githubusercontent.com/your-repo/sfti-stock-scanner/main/install.sh | bash
```

### Method 2: Manual Installation

### Prerequisites

- **Node.js** 18+ and npm
- **Interactive Brokers Account** (paper or live trading)
- **TWS or IB Gateway** installed and running
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/statikfintechllc/interactive-brokers.git
   cd sfti-stock-scanner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:5173`

### Method 3: Production Deployment

For production environments with multiple users:

1. **Install dependencies**
   ```bash
   npm install express cors compression express-rate-limit concurrently
   ```

2. **Build the application**
   ```bash
   npm run build
   ```

3. **Start all services**
   ```bash
   # Start all services (router, server, and web app)
   npm run start:prod
   
   # Or start individually
   npm run server    # Public server on port 3001
   npm run router    # IBKR router service
   npm run preview   # Web app on port 4173
   ```

## 🔧 Service Management

### Individual Services

```bash
# Start IBKR router (connects to TWS/Gateway)
npm run router

# Start public server (web API and WebSocket)
npm run server

# Start web application (development)
npm run dev

# Start all services together
npm run start:full
```

### Service Ports

- **Web App**: `http://localhost:5173` (dev) or `http://localhost:4173` (prod)
- **API Server**: `http://localhost:3001`
- **WebSocket**: `ws://localhost:3002`
- **IBKR TWS**: `localhost:7497` (or 4001 for Gateway)

## 🔧 IBKR Setup

### Interactive Brokers Configuration

1. **Install TWS or IB Gateway**
   - Download from [Interactive Brokers](https://www.interactivebrokers.com/en/trading/tws.php)
   - Install and create account connection

2. **Configure API Access**
   - Open TWS/Gateway
   - Go to `Configure → API → Settings`
   - Enable API access
   - Set Socket Port: `7497` (TWS) or `4001` (Gateway)
   - Add `127.0.0.1` to trusted IPs
   - Enable "Download open orders on connection"

3. **Paper Trading Setup** (Recommended for testing)
   - Use paper trading account for safe testing
   - Login to TWS with paper trading credentials
   - Verify connection in the app's IBKR Settings

## 📱 Cross-Platform Deployment

### Desktop Application (PWA)

The scanner can be installed as a Progressive Web App:

1. **Chrome/Edge**: Click install icon in address bar
2. **Firefox**: Use "Install this site as an app" from menu
3. **Safari**: Add to Dock from Share menu

### Mobile Installation

1. **iOS**: 
   - Open in Safari
   - Tap Share → Add to Home Screen
   
2. **Android**:
   - Open in Chrome
   - Tap menu → Add to Home Screen

## 🛠️ Development

### Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Shadcn UI components
│   ├── AISearch.tsx    # AI-powered search
│   ├── AlertsManager.tsx # Alert system
│   ├── IBKRSettings.tsx # IBKR configuration
│   └── ...
├── lib/                # Core logic
│   ├── ibkr.ts        # IBKR API integration
│   ├── alerts.ts      # Alert system
│   └── market.ts      # Market hours detection
├── types/              # TypeScript definitions
└── assets/            # Static assets
```

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type checking
npm run build
```

### Environment Configuration

Create `.env.local` for custom configuration:

```env
# IBKR Configuration
VITE_IBKR_HOST=127.0.0.1
VITE_IBKR_PORT=7497
VITE_IBKR_CLIENT_ID=1

# API Keys (optional)
VITE_ALPHA_VANTAGE_KEY=your_key_here
VITE_POLYGON_API_KEY=your_key_here
```

## 🔧 Configuration

### Scanner Filters

Default filter settings can be modified in `src/App.tsx`:

```typescript
const DEFAULT_FILTERS: ScannerFilters = {
  priceMin: 0.01,      // Minimum price
  priceMax: 5.00,      // Maximum price (penny stock definition)
  marketCapMin: 1_000_000,     // $1M minimum
  marketCapMax: 2_000_000_000, // $2B maximum
  floatMin: 1_000_000,         // 1M shares minimum
  floatMax: 1_000_000_000,     // 1B shares maximum
  volumeMin: 100_000,          // Minimum daily volume
  changeMin: -100,             // Minimum % change
  changeMax: 100,              // Maximum % change
  newsOnly: false              // Filter by news availability
};
```

### Market Hours

The app automatically detects market sessions and applies appropriate themes:

- **Pre-market** (4:00-9:30 AM EST): Dark red theme
- **Regular** (9:30 AM-4:00 PM EST): Bright red theme  
- **After-hours** (4:00-8:00 PM EST): Deep gold theme
- **Closed**: Neutral gray theme

## 🚨 Troubleshooting

### Common Issues

**IBKR Connection Failed**
- Verify TWS/Gateway is running
- Check API settings are enabled
- Confirm port configuration (7497 for TWS, 4001 for Gateway)
- Add 127.0.0.1 to trusted IPs

**No Market Data**
- Ensure market data subscriptions are active in IBKR account
- Verify account permissions for penny stocks
- Check if market is open (data may be delayed when closed)

**Performance Issues**
- Limit number of open chart tabs (max 6)
- Clear browser cache
- Close unused tabs to free memory
- Check internet connection stability

### Error Messages

- **"IBKR connection failed - running in demo mode"**: Normal when TWS isn't running
- **"Maximum 6 tabs allowed"**: Close existing tabs before opening new ones
- **"No stocks match criteria"**: Adjust filter settings to broaden search

## 📊 Data Sources

- **Primary**: Interactive Brokers TWS API
- **Charts**: IBKR real-time data with TradingView-style rendering
- **News**: Integrated IBKR news feed
- **Float Data**: IBKR fundamental data when available

## 🔐 Security

- All API keys stored locally (never transmitted)
- IBKR connections use local socket connections
- No sensitive data stored on external servers
- User preferences encrypted in local storage

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:

1. Check troubleshooting section above
2. Verify IBKR setup is correct
3. Review browser console for errors
4. Ensure all prerequisites are installed

## 🔄 Updates

The app includes an automatic update system:
- Beta toggle in settings for daily updates
- Production updates via standard deployment
- No manual intervention required

---

**⚠️ Disclaimer**: This software is for educational and analysis purposes. Always verify data independently before making trading decisions. Past performance does not guarantee future results.