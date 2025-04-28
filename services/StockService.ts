import axios from 'axios';
import { SettingsService, DataProvider } from './SettingsService';
import { EventEmitter } from 'events';

// Add an event emitter to notify components about watchlist changes
export const stockEvents = new EventEmitter();

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
}

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

// Fallback data for when API key is not set - Keep backward compatibility
const SAMPLE_STOCKS = DUMMY_STOCKS;

/**
 * Creates Tiingo API URL with authentication
 */
const createTiingoUrl = async (endpoint: string): Promise<string | null> => {
  const apiKey = await SettingsService.getTiingoApiKey();
  if (!apiKey) return null;
  return `https://api.tiingo.com/${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${apiKey}`;
};

/**
 * Formats Tiingo quote data to the app's StockData format
 */
const formatTiingoQuote = (data: any, details?: any): StockData => {
  // Default values for missing data
  const price = data.last || data.prevClose || 0;
  const prevClose = data.prevClose || price;
  const change = data.last ? data.last - prevClose : 0;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;

  return {
    symbol: data.ticker,
    name: details?.name || data.ticker,
    price: price,
    change: change,
    changePercent: changePercent,
    volume: data.volume || 0,
    marketCap: details?.marketCap || undefined,
  };
};

/**
 * Dummy Stock Provider implementation
 */
const DummyStockProvider = {
  searchStocks: async (query: string): Promise<StockData[]> => {
    console.log('Using dummy data provider for search:', query);
    
    // Return filtered dummy data
    return Object.values(DUMMY_STOCKS)
      .filter(stock => 
        stock.symbol.toUpperCase().includes(query.toUpperCase()) || 
        stock.name.toUpperCase().includes(query.toUpperCase())
      );
  },
  
  getStockQuote: async (symbol: string): Promise<StockData | null> => {
    console.log('Using dummy data provider for quote:', symbol);
    return DUMMY_STOCKS[symbol.toUpperCase()] || null;
  },
  
  getBatchQuotes: async (symbols: string[]): Promise<StockData[]> => {
    console.log('Using dummy data provider for batch quotes:', symbols);
    return symbols
      .map(symbol => DUMMY_STOCKS[symbol.toUpperCase()])
      .filter((stock): stock is StockData => stock !== undefined);
  }
};

/**
 * Tiingo Stock Provider implementation
 */
const TiingoStockProvider = {
  searchStocks: async (query: string): Promise<StockData[]> => {
    try {
      // Create URL for Tiingo search
      const url = await createTiingoUrl(`tiingo/utilities/search?query=${encodeURIComponent(query)}`);
      if (!url) throw new Error('Could not create API URL');
      
      const response = await axios.get(url);
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response from Tiingo search API');
      }
      
      // Transform Tiingo search results to our format
      const promises = response.data.slice(0, 10).map(async (item: any) => {
        if (item.ticker) {
          try {
            // Get more details for the stock
            const quoteUrl = await createTiingoUrl(`iex/${item.ticker}`);
            if (!quoteUrl) throw new Error('Could not create quote URL');
            
            const quoteResponse = await axios.get(quoteUrl);
            
            if (quoteResponse.data && quoteResponse.data.length > 0) {
              return formatTiingoQuote(quoteResponse.data[0], item);
            }
          } catch (error) {
            console.error(`Error fetching details for ${item.ticker}:`, error);
          }
        }
        
        // Fallback with limited data if quote fetch fails
        return {
          symbol: item.ticker || '',
          name: item.name || '',
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
        };
      });
      
      const results = await Promise.all(promises);
      return results.filter(stock => stock.symbol);
    } catch (error) {
      console.error('Error searching stocks:', error);
      return [];
    }
  },
  
  getStockQuote: async (symbol: string): Promise<StockData | null> => {
    try {
      // Get stock quote from Tiingo
      const quoteUrl = await createTiingoUrl(`iex/${symbol}`);
      if (!quoteUrl) throw new Error('Could not create quote URL');
      
      const quoteResponse = await axios.get(quoteUrl);
      
      if (!quoteResponse.data || !Array.isArray(quoteResponse.data) || quoteResponse.data.length === 0) {
        throw new Error(`No data returned for symbol ${symbol}`);
      }
      
      // Get additional stock details from Tiingo
      const metaUrl = await createTiingoUrl(`tiingo/daily/${symbol}`);
      if (!metaUrl) throw new Error('Could not create metadata URL');
      
      const metaResponse = await axios.get(metaUrl);
      const metaData = metaResponse.data || {};
      
      return formatTiingoQuote(quoteResponse.data[0], metaData);
    } catch (error) {
      console.error(`Error fetching stock data for ${symbol}:`, error);
      return null;
    }
  },
  
  getBatchQuotes: async (symbols: string[]): Promise<StockData[]> => {
    try {
      // Fetch data for all symbols in parallel
      const promises = symbols.map(symbol => TiingoStockProvider.getStockQuote(symbol));
      const results = await Promise.all(promises);
      
      // Filter out any failed requests (null responses)
      return results.filter((stock): stock is StockData => stock !== null);
    } catch (error) {
      console.error('Error fetching batch quotes:', error);
      return [];
    }
  }
};

export const StockService = {
  /**
   * Search for stocks by a query string
   */
  searchStocks: async (query: string): Promise<StockData[]> => {
    try {
      // Check which data provider to use
      const isUsingDummy = await SettingsService.isUsingDummyProvider();
      
      // If using Tiingo provider, check if API key is set
      const isTiingo = !isUsingDummy;
      if (isTiingo) {
        const hasApiKey = await SettingsService.hasTiingoApiKey();
        if (!hasApiKey) {
          console.log('No Tiingo API key set, using dummy data');
          return DummyStockProvider.searchStocks(query);
        }
        return TiingoStockProvider.searchStocks(query);
      }
      
      // Using dummy provider
      return DummyStockProvider.searchStocks(query);
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
      // Check which data provider to use
      const isUsingDummy = await SettingsService.isUsingDummyProvider();
      
      // If using Tiingo provider, check if API key is set
      const isTiingo = !isUsingDummy;
      if (isTiingo) {
        const hasApiKey = await SettingsService.hasTiingoApiKey();
        if (!hasApiKey) {
          console.log('No Tiingo API key set, using dummy data');
          return DummyStockProvider.getStockQuote(symbol);
        }
        return TiingoStockProvider.getStockQuote(symbol);
      }
      
      // Using dummy provider
      return DummyStockProvider.getStockQuote(symbol);
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
      // Check which data provider to use
      const isUsingDummy = await SettingsService.isUsingDummyProvider();
      
      // If using Tiingo provider, check if API key is set
      const isTiingo = !isUsingDummy;
      if (isTiingo) {
        const hasApiKey = await SettingsService.hasTiingoApiKey();
        if (!hasApiKey) {
          console.log('No Tiingo API key set, using dummy data');
          return DummyStockProvider.getBatchQuotes(symbols);
        }
        return TiingoStockProvider.getBatchQuotes(symbols);
      }
      
      // Using dummy provider
      return DummyStockProvider.getBatchQuotes(symbols);
    } catch (error) {
      console.error('Error fetching batch quotes:', error);
      return [];
    }
  }
};
