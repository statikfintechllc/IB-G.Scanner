import { Stock } from '@/types';

const PENNY_STOCKS = [
  'SNDL', 'NAKD', 'TNXP', 'IDEX', 'XSPA', 'GNUS', 'MARK', 'UAVS', 
  'VISL', 'AYTU', 'SHIP', 'KTOV', 'XELA', 'RMED', 'ATOS', 'JAGX',
  'DPLS', 'GEVO', 'ADMP', 'OCGN', 'SENS', 'ZSAN', 'CLSK', 'RIOT',
  'MARA', 'WKEY', 'PHUN', 'DWAC', 'BBIG', 'PROG'
];

const COMPANY_NAMES: Record<string, string> = {
  'SNDL': 'Sundial Growers Inc.',
  'NAKD': 'Naked Brand Group',
  'TNXP': 'Tonix Pharmaceuticals',
  'IDEX': 'Ideanomics Inc.',
  'XSPA': 'XpresSpa Group Inc.',
  'GNUS': 'Genius Brands International',
  'MARK': 'Remark Holdings Inc.',
  'UAVS': 'AgEagle Aerial Systems',
  'VISL': 'Vislink Technologies',
  'AYTU': 'Aytu BioPharma Inc.',
  'SHIP': 'Seanergy Maritime',
  'KTOV': 'Kitov Pharma Ltd.',
  'XELA': 'Exela Technologies',
  'RMED': 'Ra Medical Systems',
  'ATOS': 'Atossa Therapeutics',
  'JAGX': 'Jaguar Health Inc.',
  'DPLS': 'DarkPulse Inc.',
  'GEVO': 'Gevo Inc.',
  'ADMP': 'Adamis Pharmaceuticals',
  'OCGN': 'Ocugen Inc.',
  'SENS': 'Senseonics Holdings',
  'ZSAN': 'Zosano Pharma Corp.',
  'CLSK': 'CleanSpark Inc.',
  'RIOT': 'Riot Platforms Inc.',
  'MARA': 'Marathon Digital',
  'WKEY': 'WISeKey International',
  'PHUN': 'Phunware Inc.',
  'DWAC': 'Digital World Acquisition',
  'BBIG': 'Vinco Ventures Inc.',
  'PROG': 'Progenity Inc.'
};

function generateRandomStock(symbol: string): Stock {
  const basePrice = Math.random() * 4.5 + 0.5; // $0.50 - $5.00
  const change = (Math.random() - 0.5) * 0.8; // -$0.40 to +$0.40
  const changePercent = (change / basePrice) * 100;
  
  return {
    symbol,
    name: COMPANY_NAMES[symbol] || `${symbol} Corp.`,
    price: Math.max(0.01, basePrice + change),
    change,
    changePercent,
    volume: Math.floor(Math.random() * 50_000_000) + 1_000_000, // 1M - 51M
    marketCap: Math.floor(Math.random() * 2_000_000_000) + 50_000_000, // 50M - 2.05B
    float: Math.floor(Math.random() * 800_000_000) + 50_000_000, // 50M - 850M
    news: Math.floor(Math.random() * 8), // 0-7 news items
    lastUpdate: new Date()
  };
}

export function generateMockData(): Stock[] {
  return PENNY_STOCKS.map(generateRandomStock);
}

export function updateStockPrices(stocks: Stock[]): Stock[] {
  return stocks.map(stock => {
    // 70% chance of small price movement
    if (Math.random() < 0.7) {
      const volatility = 0.05; // 5% max movement
      const change = (Math.random() - 0.5) * volatility * stock.price;
      const newPrice = Math.max(0.01, stock.price + change);
      const totalChange = newPrice - (stock.price - stock.change);
      
      return {
        ...stock,
        price: newPrice,
        change: totalChange,
        changePercent: (totalChange / (newPrice - totalChange)) * 100,
        volume: stock.volume + Math.floor(Math.random() * 100_000),
        lastUpdate: new Date()
      };
    }
    
    return {
      ...stock,
      lastUpdate: new Date()
    };
  });
}