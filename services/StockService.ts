import { EventEmitter } from 'events';
import { SettingsService } from './SettingsService';
import { DummyStockProvider } from './providers/DummyStockProvider';
import { TiingoStockProvider } from './providers/TiingoStockProvider';

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

// Define interface for stock data providers
export interface StockDataProvider {
  searchStocks(query: string): Promise<StockData[]>;
  getStockQuote(symbol: string): Promise<StockData | null>;
  getBatchQuotes(symbols: string[]): Promise<StockData[]>;
}

/**
 * The main service that selects and uses the appropriate stock data provider
 */
export const StockService = (() => {
  // Private variable to store the current provider instance
  let _currentProvider: StockDataProvider | null = null;
  let _isInitialized = false;

  /**
   * Initialize the service and determine the appropriate provider
   */
  const initialize = async (): Promise<void> => {
    if (!_isInitialized) {
      await refreshProvider();
      _isInitialized = true;
    }
  };

  /**
   * Force a refresh of the provider based on current settings
   */
  const refreshProvider = async (): Promise<void> => {
    const isUsingDummy = await SettingsService.isUsingDummyProvider();
    
    // If using Tiingo provider, check if API key is set
    const isTiingo = !isUsingDummy;
    if (isTiingo) {
      const hasApiKey = await SettingsService.hasTiingoApiKey();
      if (!hasApiKey) {
        console.log('No Tiingo API key set, using dummy data');
        _currentProvider = new DummyStockProvider();
      } else {
        _currentProvider = new TiingoStockProvider();
      }
    } else {
      // Using dummy provider
      _currentProvider = new DummyStockProvider();
    }
  };

  /**
   * Get the current provider instance, initializing if necessary
   */
  const getProvider = async (): Promise<StockDataProvider> => {
    if (!_currentProvider) {
      await initialize();
    }
    // TypeScript non-null assertion operator is used here because we know
    // _currentProvider will be set after initialize()
    return _currentProvider!;
  };

  return {
    /**
     * Initialize the service and determine which provider to use
     * This can be called explicitly at app startup, but will also
     * be called automatically on first use if needed
     */
    initialize,

    /**
     * Reset the provider - useful when settings change
     */
    resetProvider: refreshProvider,

    /**
     * Search for stocks by a query string
     */
    searchStocks: async (query: string): Promise<StockData[]> => {
      try {
        const provider = await getProvider();
        return provider.searchStocks(query);
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
        const provider = await getProvider();
        return provider.getStockQuote(symbol);
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
        const provider = await getProvider();
        return provider.getBatchQuotes(symbols);
      } catch (error) {
        console.error('Error fetching batch quotes:', error);
        return [];
      }
    }
  };
})();
