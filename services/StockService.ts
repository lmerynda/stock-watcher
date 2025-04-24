import yahooFinance from 'yahoo-finance2';

// Suppress the Yahoo Finance survey notice
yahooFinance.suppressNotices(['yahooSurvey']);

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
}

// Sample stock data for demo purposes
const MOCK_STOCKS: Record<string, StockData> = {
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
    price: 175.34,
    change: -1.56,
    changePercent: -0.88,
    volume: 15786432,
    marketCap: 2200000000000,
  },
  'AMZN': {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    price: 192.45,
    change: 4.32,
    changePercent: 2.29,
    volume: 28976543,
    marketCap: 1950000000000,
  },
  'META': {
    symbol: 'META',
    name: 'Meta Platforms, Inc.',
    price: 478.22,
    change: -3.78,
    changePercent: -0.78,
    volume: 18543267,
    marketCap: 1250000000000,
  },
  'TSLA': {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 168.38,
    change: 5.43,
    changePercent: 3.33,
    volume: 72345678,
    marketCap: 535000000000,
  },
  'NVDA': {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 887.56,
    change: 12.87,
    changePercent: 1.47,
    volume: 35678954,
    marketCap: 2180000000000,
  },
  'NFLX': {
    symbol: 'NFLX',
    name: 'Netflix, Inc.',
    price: 632.77,
    change: -8.23,
    changePercent: -1.28,
    volume: 12453678,
    marketCap: 280000000000,
  },
  'JPM': {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    price: 203.45,
    change: 1.87,
    changePercent: 0.93,
    volume: 9876543,
    marketCap: 592000000000,
  },
  'V': {
    symbol: 'V',
    name: 'Visa Inc.',
    price: 278.32,
    change: 0.56,
    changePercent: 0.20,
    volume: 7654321,
    marketCap: 575000000000,
  }
};

// Helper function to generate slightly random price movements
const generatePriceMovement = (stock: StockData): StockData => {
  // Generate a random percentage change between -2% and +2%
  const randomFactor = (Math.random() * 4 - 2) / 100;
  
  // Calculate new price with the random movement
  const newPrice = stock.price * (1 + randomFactor);
  
  // Calculate change and change percent
  const change = newPrice - stock.price;
  const changePercent = (change / stock.price) * 100;
  
  // Generate a random volume fluctuation
  const volumeFactor = 0.8 + Math.random() * 0.4; // 80% to 120% of original volume
  
  return {
    ...stock,
    price: parseFloat(newPrice.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    volume: Math.floor(stock.volume * volumeFactor),
  };
};

export const StockService = {
  /**
   * Search for stocks by a query string
   */
  searchStocks: async (query: string): Promise<StockData[]> => {
    try {
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Filter mock stocks based on the query
      const queryUpper = query.toUpperCase();
      return Object.values(MOCK_STOCKS)
        .filter(stock => 
          stock.symbol.includes(queryUpper) || 
          stock.name.toUpperCase().includes(queryUpper)
        );
    } catch (error) {
      console.error('Error searching stocks:', error);
      return [];
    }
  },

  /**
   * Get detailed stock information for a symbol
   */
  getStockQuote: async (symbol: string): Promise<StockData | null> => {
    try {
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 700));
      
      // Check if we have the stock in our mock data
      const stockData = MOCK_STOCKS[symbol.toUpperCase()];
      
      if (!stockData) {
        return null;
      }
      
      // Return with some random price movement to simulate real data
      return generatePriceMovement(stockData);
    } catch (error) {
      console.error(`Error fetching stock data for ${symbol}:`, error);
      return null;
    }
  },

  /**
   * Get quotes for multiple stock symbols at once
   */
  getBatchQuotes: async (symbols: string[]): Promise<StockData[]> => {
    try {
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Process each symbol and return the results
      return symbols
        .map(symbol => MOCK_STOCKS[symbol.toUpperCase()])
        .filter((stock): stock is StockData => stock !== undefined)
        .map(stock => generatePriceMovement(stock));
    } catch (error) {
      console.error('Error fetching batch quotes:', error);
      return [];
    }
  }
};
