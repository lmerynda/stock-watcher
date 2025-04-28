import { StockData, StockDataProvider } from '../StockService';

// Enhanced dummy data with popular stocks mentioned in UI and more realistic data
const DUMMY_STOCKS: Record<string, StockData> = {
  'AAPL': {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 205.73,
    change: 2.15,
    changePercent: 1.05,
    volume: 58432156,
    marketCap: 3200000000000,
  },
  'MSFT': {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 412.67,
    change: 3.28,
    changePercent: 0.80,
    volume: 22145678,
    marketCap: 3100000000000,
  },
  'GOOGL': {
    symbol: 'GOOGL', 
    name: 'Alphabet Inc.',
    price: 176.92,
    change: -1.23,
    changePercent: -0.69,
    volume: 15234567,
    marketCap: 2200000000000,
  },
  'AMZN': {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    price: 183.47,
    change: 1.34,
    changePercent: 0.74,
    volume: 31245678,
    marketCap: 1900000000000,
  },
  'META': {
    symbol: 'META',
    name: 'Meta Platforms, Inc.',
    price: 474.72,
    change: 3.56,
    changePercent: 0.76,
    volume: 19876543,
    marketCap: 1200000000000,
  },
  'TSLA': {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 215.32,
    change: -4.89,
    changePercent: -2.22,
    volume: 45678912,
    marketCap: 680000000000,
  },
  'NVDA': {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 879.15,
    change: 12.36,
    changePercent: 1.42,
    volume: 37654321,
    marketCap: 2170000000000,
  },
  'NFLX': {
    symbol: 'NFLX',
    name: 'Netflix, Inc.',
    price: 637.45,
    change: 5.21,
    changePercent: 0.82,
    volume: 12345876,
    marketCap: 280000000000,
  },
  'JPM': {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    price: 193.74,
    change: -0.87,
    changePercent: -0.45,
    volume: 15678234,
    marketCap: 560000000000,
  },
  'V': {
    symbol: 'V',
    name: 'Visa Inc.',
    price: 274.52,
    change: 1.21,
    changePercent: 0.44,
    volume: 10234567,
    marketCap: 550000000000,
  }
};

// Export for backward compatibility
export const SAMPLE_STOCKS = DUMMY_STOCKS;

/**
 * Dummy Stock Provider implementation
 */
export class DummyStockProvider implements StockDataProvider {
  async searchStocks(query: string): Promise<StockData[]> {
    console.log('Using dummy data provider for search:', query);
    
    // Return filtered dummy data
    return Object.values(DUMMY_STOCKS)
      .filter(stock => 
        stock.symbol.toUpperCase().includes(query.toUpperCase()) || 
        stock.name.toUpperCase().includes(query.toUpperCase())
      );
  }
  
  async getStockQuote(symbol: string): Promise<StockData | null> {
    console.log('Using dummy data provider for quote:', symbol);
    return DUMMY_STOCKS[symbol.toUpperCase()] || null;
  }
  
  async getBatchQuotes(symbols: string[]): Promise<StockData[]> {
    console.log('Using dummy data provider for batch quotes:', symbols);
    return symbols
      .map(symbol => DUMMY_STOCKS[symbol.toUpperCase()])
      .filter((stock): stock is StockData => stock !== undefined);
  }
}
