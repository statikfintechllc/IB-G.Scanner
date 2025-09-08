# SFTi Stock Scanner - GitHub Copilot Instructions

**ALWAYS follow these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

This is a professional real-time penny stock scanner with Interactive Brokers (IBKR) integration, featuring AI-powered analysis, pattern recognition, and comprehensive market insights.

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite 6.3.5, TailwindCSS 4.1.11
- **UI Components**: Radix UI, Shadcn/ui, Phosphor Icons
- **Charts**: Lightweight Charts library
- **Backend Services**: Node.js with Express (server.cjs, router.cjs)
- **Real-time Data**: WebSocket connections to Interactive Brokers TWS/Gateway
- **Build Tool**: Vite with TypeScript compilation

## Working Effectively

### Initial Setup and Dependencies
1. Verify Node.js and npm are available:
   ```bash
   node --version  # Should be v20.19.4+
   npm --version   # Should be 10.8.2+
   ```

2. Install all dependencies:
   ```bash
   npm install
   ```
   - **Takes**: ~40 seconds
   - **NEVER CANCEL**: Wait for completion, no timeout needed

### Build and Development Commands

3. **Build the application**:
   ```bash
   npm run build
   ```
   - **Takes**: ~10 seconds
   - **NEVER CANCEL**: Wait for completion, no timeout needed
   - Output: TypeScript compilation + Vite build to `dist/` directory

4. **Development server**:
   ```bash
   npm run dev
   ```
   - **Port**: http://localhost:5000 (not 5173 as typical)
   - **Startup time**: ~1 second
   - **Auto-reload**: Yes, with HMR (Hot Module Replacement)

5. **Production preview**:
   ```bash
   npm run preview
   ```
   - **Port**: http://localhost:4173
   - **Requires**: `npm run build` to be run first

### Linting and Code Quality

6. **Lint the codebase**:
   ```bash
   npm run lint
   ```
   - **Takes**: ~2-5 seconds
   - **Current status**: Passes with 48 warnings (no errors)
   - **Files ignored**: `dist/`, `node_modules/`, `*.cjs`, `router.js`, `server.js`, `scripts/`
   - **Config**: Uses ESLint 9 with React and TypeScript support

### Service Management

7. **Backend services**:
   ```bash
   # Public server (works without IBKR)
   npm run server
   # Port: 3001 (HTTP), 3002 (WebSocket)
   # Status: ✅ Works
   
   # IBKR router (requires TWS/Gateway)
   npm run router
   # Status: ❌ Fails without @ib/tws-api package and IBKR connection
   # Expected behavior: This is normal in development
   ```

8. **Start all services together**:
   ```bash
   # Development mode
   npm run start:full
   # Runs: server + router + dev server concurrently
   
   # Production mode  
   npm run start:prod
   # Runs: server + router + preview server concurrently
   ```

## Manual Validation Requirements

### Required Testing After Changes

**ALWAYS test the complete user scenario after making changes:**

1. **Build and start the application**:
   ```bash
   npm run build && npm run dev
   ```

2. **Open browser and navigate to**: http://localhost:5000

3. **Verify core functionality**:
   - Application loads with "SFTi Stock Scanner" title
   - Shows market hours status (Pre-market/Regular/After-hours/Closed)
   - Displays "0 stocks • Updated [timestamp]" indicating data system works
   - All main buttons are visible: AI Search, Market Insights, Alerts, IBKR
   - Tab system works with "SFTi Top 10" and "Scanner" tabs
   - App shows "IBKR connection failed, running in demo mode" (expected without TWS)

4. **Expected visual result**: ![Working SFTi Scanner](https://github.com/user-attachments/assets/6aa08f19-8daa-4134-98d2-fff10c90f92a)

### Critical Validation Steps

- **ALWAYS run `npm run lint` before committing** - must pass with no errors
- **ALWAYS test the development server** - verify UI loads correctly
- **ALWAYS verify the build completes** - check for TypeScript errors
- **Never skip manual browser testing** - automated tests don't exist

## Architecture and File Structure

### Key Files and Directories
```
/
├── src/                     # React TypeScript source code
│   ├── components/          # React components (UI, Charts, etc.)
│   ├── lib/                # Core logic (IBKR, alerts, AI patterns)
│   ├── types/              # TypeScript type definitions
│   └── App.tsx             # Main application component
├── dist/                   # Built application (auto-generated)
├── server.cjs              # Express HTTP/WebSocket server
├── router.cjs              # IBKR data router service  
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite build configuration
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.js      # TailwindCSS configuration
└── eslint.config.js        # ESLint linting rules
```

### Service Architecture
```
IBKR TWS/Gateway → router.cjs → server.cjs → Web Client (React)
                    (port 7497)   (port 3001)   (port 5000)
```

## Important Development Notes

### Working Without IBKR
- **Expected**: Router service fails without Interactive Brokers TWS/Gateway
- **Normal behavior**: Application runs in "demo mode" 
- **For development**: Use `npm run dev` and `npm run server` separately
- **Frontend works fully** without backend services

### Build and Module System
- **Package type**: ES modules (`"type": "module"` in package.json)
- **Backend services**: Use CommonJS (`.cjs` extension)
- **Issue resolved**: Original `.js` files renamed to `.cjs` for compatibility

### Linting Configuration
- **ESLint version**: 9.35.0 (latest flat config format)
- **React support**: Configured for React 19 with JSX transform
- **TypeScript**: Full support with warnings for `any` types
- **Ignores**: Built files, Node.js services, and dependencies

### Performance Notes
- **Build size**: ~646KB JavaScript, ~248KB CSS (with warnings about chunk size)
- **Icon system**: Uses icon proxy that maps missing icons to "Question" fallback
- **Chart bundle**: Includes Lightweight Charts library for financial data visualization

## Common Development Tasks

### Adding New Features
1. Make changes to TypeScript/React files in `src/`
2. Run `npm run lint` to check code style
3. Run `npm run build` to verify TypeScript compilation
4. Test with `npm run dev` and verify UI functionality
5. Always test complete user scenarios manually

### Debugging Issues
- **Check browser console**: Look for React/JavaScript errors
- **Verify ports**: Dev (5000), Server (3001), Preview (4173)
- **IBKR connection**: Expected to fail in development without TWS
- **Build errors**: Usually TypeScript compilation issues

### Dependencies Management
- **Add dependencies**: `npm install <package>`
- **Update dependencies**: Check `package.json` for version ranges
- **Audit vulnerabilities**: `npm audit` (currently 1 low severity)

## DO NOT Attempt

- **Do not try to fix the router service** - requires IBKR TWS/Gateway setup
- **Do not modify `.cjs` files to ES modules** - they need CommonJS for dependencies
- **Do not remove "demo mode" functionality** - it's essential for development
- **Do not add test frameworks** - none exist currently, keep minimal changes