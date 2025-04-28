import axios from 'axios';
import { SettingsService } from '../SettingsService';
import { StockData, StockDataProvider } from '../StockService';

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
 * Tiingo Stock Provider implementation
 */
export class TiingoStockProvider implements StockDataProvider {
  async searchStocks(query: string): Promise<StockData[]> {
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
  }
  
  async getStockQuote(symbol: string): Promise<StockData | null> {
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
  }
  
  async getBatchQuotes(symbols: string[]): Promise<StockData[]> {
    try {
      // Fetch data for all symbols in parallel
      const promises = symbols.map(symbol => this.getStockQuote(symbol));
      const results = await Promise.all(promises);
      
      // Filter out any failed requests (null responses)
      return results.filter((stock): stock is StockData => stock !== null);
    } catch (error) {
      console.error('Error fetching batch quotes:', error);
      return [];
    }
  }
}
