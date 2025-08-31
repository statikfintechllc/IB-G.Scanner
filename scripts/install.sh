#!/bin/bash

# SFTi Stock Scanner - Cross-Platform Installation Script
# Supports: Windows (WSL/MSYS2), macOS, Linux (Ubuntu/Debian/RHEL/Arch)

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="SFTi Stock Scanner"
APP_DIR="$HOME/.sfti-scanner"
SERVICE_NAME="sfti-scanner"
ROUTER_PORT=8080
SERVER_PORT=3000
WS_PORT=3001

# Detect OS and distribution
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            OS=$NAME
            DISTRO=$ID
        else
            OS="Linux"
            DISTRO="unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macOS"
        DISTRO="macos"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        OS="Windows"
        DISTRO="windows"
    else
        OS="Unknown"
        DISTRO="unknown"
    fi
}

# Print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Check if running as root (except on macOS)
check_root() {
    if [[ $EUID -eq 0 ]] && [[ "$OS" != "macOS" ]]; then
        print_error "This script should not be run as root"
        exit 1
    fi
}

# Install Node.js based on OS
install_nodejs() {
    print_header "Installing Node.js"
    
    case "$DISTRO" in
        "ubuntu"|"debian")
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        "rhel"|"centos"|"fedora")
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo yum install -y nodejs npm
            ;;
        "arch"|"manjaro")
            sudo pacman -S --noconfirm nodejs npm
            ;;
        "macos")
            if ! command -v brew &> /dev/null; then
                print_status "Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            brew install node
            ;;
        "windows")
            print_warning "Please install Node.js manually from https://nodejs.org/"
            print_warning "Then run this script again"
            exit 1
            ;;
        *)
            print_error "Unsupported distribution: $DISTRO"
            print_warning "Please install Node.js 18+ manually"
            exit 1
            ;;
    esac
    
    # Verify installation
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        print_status "Node.js $(node --version) installed successfully"
    else
        print_error "Node.js installation failed"
        exit 1
    fi
}

# Install Python based on OS
install_python() {
    print_header "Installing Python"
    
    case "$DISTRO" in
        "ubuntu"|"debian")
            sudo apt-get update
            sudo apt-get install -y python3 python3-pip python3-venv
            ;;
        "rhel"|"centos"|"fedora")
            sudo yum install -y python3 python3-pip
            ;;
        "arch"|"manjaro")
            sudo pacman -S --noconfirm python python-pip
            ;;
        "macos")
            brew install python
            ;;
        "windows")
            print_warning "Please install Python 3.8+ manually from https://python.org/"
            ;;
        *)
            print_error "Unsupported distribution for Python installation"
            ;;
    esac
}

# Install system dependencies
install_dependencies() {
    print_header "Installing System Dependencies"
    
    case "$DISTRO" in
        "ubuntu"|"debian")
            sudo apt-get update
            sudo apt-get install -y curl wget git build-essential
            ;;
        "rhel"|"centos"|"fedora")
            sudo yum groupinstall -y "Development Tools"
            sudo yum install -y curl wget git
            ;;
        "arch"|"manjaro")
            sudo pacman -S --noconfirm curl wget git base-devel
            ;;
        "macos")
            # Xcode command line tools
            xcode-select --install 2>/dev/null || true
            ;;
        "windows")
            print_warning "Please ensure you have Git and build tools installed"
            ;;
    esac
}

# Create application directory structure
create_directories() {
    print_header "Creating Application Directories"
    
    mkdir -p "$APP_DIR"/{router,server,logs,config,data}
    mkdir -p "$APP_DIR"/config/{router,server}
    
    print_status "Created directory structure at $APP_DIR"
}

# Download and setup application files
setup_application() {
    print_header "Setting Up Application Files"
    
    cd "$APP_DIR"
    
    # Create package.json for router
    cat > router/package.json << 'EOF'
{
  "name": "sfti-router",
  "version": "1.0.0",
  "description": "IBKR data router for SFTi Stock Scanner",
  "main": "router.js",
  "scripts": {
    "start": "node router.js",
    "dev": "nodemon router.js"
  },
  "dependencies": {
    "ws": "^8.14.2",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "axios": "^1.6.0",
    "node-ib": "^0.2.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF

    # Create package.json for server
    cat > server/package.json << 'EOF'
{
  "name": "sfti-server",
  "version": "1.0.0",
  "description": "Public server for SFTi Stock Scanner",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "redis": "^4.6.8",
    "dotenv": "^16.3.1",
    "axios": "^1.6.0",
    "rate-limiter-flexible": "^3.0.8"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF

    # Install dependencies
    print_status "Installing Router dependencies..."
    cd router && npm install
    
    print_status "Installing Server dependencies..."
    cd ../server && npm install
    
    cd "$APP_DIR"
}

# Create configuration files
create_configs() {
    print_header "Creating Configuration Files"
    
    # Router configuration
    cat > config/router/.env << EOF
# IBKR Connection Settings
IBKR_HOST=127.0.0.1
IBKR_PORT=7497
IBKR_CLIENT_ID=1

# Router Settings
ROUTER_PORT=$ROUTER_PORT
ROUTER_HOST=0.0.0.0

# Server Connection
SERVER_HOST=localhost
SERVER_PORT=$SERVER_PORT

# Logging
LOG_LEVEL=info
LOG_FILE=$APP_DIR/logs/router.log

# Data Settings
UPDATE_INTERVAL=3000
MARKET_DATA_CACHE_TTL=5000
EOF

    # Server configuration
    cat > config/server/.env << EOF
# Server Settings
SERVER_PORT=$SERVER_PORT
WS_PORT=$WS_PORT
SERVER_HOST=0.0.0.0

# Router Connection
ROUTER_HOST=localhost
ROUTER_PORT=$ROUTER_PORT

# Redis Settings (optional)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false

# Security
JWT_SECRET=your-jwt-secret-change-this
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=1000

# Logging
LOG_LEVEL=info
LOG_FILE=$APP_DIR/logs/server.log
EOF

    print_status "Configuration files created"
}

# Create systemd service files (Linux)
create_systemd_services() {
    if [[ "$OS" != "Linux" ]]; then
        return
    fi
    
    print_header "Creating System Services"
    
    # Router service
    sudo tee /etc/systemd/system/sfti-router.service > /dev/null << EOF
[Unit]
Description=SFTi Stock Scanner Router
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR/router
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/config/router/.env
ExecStart=/usr/bin/node router.js
Restart=always
RestartSec=10
StandardOutput=append:$APP_DIR/logs/router.log
StandardError=append:$APP_DIR/logs/router-error.log

[Install]
WantedBy=multi-user.target
EOF

    # Server service
    sudo tee /etc/systemd/system/sfti-server.service > /dev/null << EOF
[Unit]
Description=SFTi Stock Scanner Server
After=network.target sfti-router.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR/server
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/config/server/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:$APP_DIR/logs/server.log
StandardError=append:$APP_DIR/logs/server-error.log

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    print_status "Systemd services created"
}

# Create launchd services (macOS)
create_launchd_services() {
    if [[ "$OS" != "macOS" ]]; then
        return
    fi
    
    print_header "Creating Launch Agents"
    
    mkdir -p ~/Library/LaunchAgents
    
    # Router service
    cat > ~/Library/LaunchAgents/com.sfti.router.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.sfti.router</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>$APP_DIR/router/router.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$APP_DIR/router</string>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$APP_DIR/logs/router.log</string>
    <key>StandardErrorPath</key>
    <string>$APP_DIR/logs/router-error.log</string>
</dict>
</plist>
EOF

    # Server service
    cat > ~/Library/LaunchAgents/com.sfti.server.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.sfti.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>$APP_DIR/server/server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$APP_DIR/server</string>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$APP_DIR/logs/server.log</string>
    <key>StandardErrorPath</key>
    <string>$APP_DIR/logs/server-error.log</string>
</dict>
</plist>
EOF

    print_status "Launch agents created"
}

# Create startup scripts
create_startup_scripts() {
    print_header "Creating Startup Scripts"
    
    # Start script
    cat > "$APP_DIR/start.sh" << 'EOF'
#!/bin/bash
APP_DIR="$HOME/.sfti-scanner"

start_service() {
    local service=$1
    local OS=$(uname)
    
    if [[ "$OS" == "Linux" ]]; then
        sudo systemctl start sfti-$service
        sudo systemctl enable sfti-$service
    elif [[ "$OS" == "Darwin" ]]; then
        launchctl load ~/Library/LaunchAgents/com.sfti.$service.plist
    else
        echo "Starting $service manually..."
        cd "$APP_DIR/$service"
        nohup node ${service}.js > "../logs/${service}.log" 2>&1 &
        echo $! > "../logs/${service}.pid"
    fi
}

echo "Starting SFTi Stock Scanner services..."
start_service router
sleep 2
start_service server

echo "Services started. Check logs at $APP_DIR/logs/"
EOF

    # Stop script
    cat > "$APP_DIR/stop.sh" << 'EOF'
#!/bin/bash
APP_DIR="$HOME/.sfti-scanner"

stop_service() {
    local service=$1
    local OS=$(uname)
    
    if [[ "$OS" == "Linux" ]]; then
        sudo systemctl stop sfti-$service
    elif [[ "$OS" == "Darwin" ]]; then
        launchctl unload ~/Library/LaunchAgents/com.sfti.$service.plist
    else
        if [ -f "$APP_DIR/logs/${service}.pid" ]; then
            kill $(cat "$APP_DIR/logs/${service}.pid")
            rm "$APP_DIR/logs/${service}.pid"
        fi
    fi
}

echo "Stopping SFTi Stock Scanner services..."
stop_service server
stop_service router

echo "Services stopped."
EOF

    chmod +x "$APP_DIR/start.sh" "$APP_DIR/stop.sh"
    print_status "Startup scripts created"
}

# Create desktop entry (Linux)
create_desktop_entry() {
    if [[ "$OS" != "Linux" ]]; then
        return
    fi
    
    print_header "Creating Desktop Entry"
    
    mkdir -p ~/.local/share/applications
    
    cat > ~/.local/share/applications/sfti-scanner.desktop << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=SFTi Stock Scanner
Comment=Professional penny stock scanner
Exec=xdg-open http://localhost:3000
Icon=utilities-system-monitor
Terminal=false
Categories=Office;Finance;
EOF

    update-desktop-database ~/.local/share/applications/ 2>/dev/null || true
    print_status "Desktop entry created"
}

# Install firewall rules
setup_firewall() {
    print_header "Setting Up Firewall Rules"
    
    case "$DISTRO" in
        "ubuntu"|"debian")
            if command -v ufw &> /dev/null; then
                sudo ufw allow $ROUTER_PORT/tcp comment "SFTi Router"
                sudo ufw allow $SERVER_PORT/tcp comment "SFTi Server"
                sudo ufw allow $WS_PORT/tcp comment "SFTi WebSocket"
            fi
            ;;
        "rhel"|"centos"|"fedora")
            if command -v firewall-cmd &> /dev/null; then
                sudo firewall-cmd --permanent --add-port=$ROUTER_PORT/tcp
                sudo firewall-cmd --permanent --add-port=$SERVER_PORT/tcp
                sudo firewall-cmd --permanent --add-port=$WS_PORT/tcp
                sudo firewall-cmd --reload
            fi
            ;;
        "arch"|"manjaro")
            if command -v ufw &> /dev/null; then
                sudo ufw allow $ROUTER_PORT/tcp
                sudo ufw allow $SERVER_PORT/tcp
                sudo ufw allow $WS_PORT/tcp
            fi
            ;;
    esac
    
    print_status "Firewall rules configured"
}

# Main installation function
main() {
    print_header "SFTi Stock Scanner Installation"
    
    detect_os
    print_status "Detected OS: $OS ($DISTRO)"
    
    check_root
    
    # Install dependencies
    install_dependencies
    install_nodejs
    install_python
    
    # Setup application
    create_directories
    setup_application
    create_configs
    
    # Create services
    create_systemd_services
    create_launchd_services
    create_startup_scripts
    create_desktop_entry
    
    # Setup firewall
    setup_firewall
    
    print_header "Installation Complete!"
    print_status "Application installed to: $APP_DIR"
    print_status "Configuration files: $APP_DIR/config/"
    print_status "Log files: $APP_DIR/logs/"
    echo ""
    print_status "To start the services:"
    echo "  $APP_DIR/start.sh"
    echo ""
    print_status "To stop the services:"
    echo "  $APP_DIR/stop.sh"
    echo ""
    print_status "Web interface will be available at:"
    echo "  http://localhost:$SERVER_PORT"
    echo ""
    print_warning "Next steps:"
    echo "1. Configure IBKR TWS/Gateway connection in $APP_DIR/config/router/.env"
    echo "2. Start TWS or IB Gateway"
    echo "3. Run: $APP_DIR/start.sh"
    echo "4. Open http://localhost:$SERVER_PORT in your browser"
}

# Run main function
main "$@"