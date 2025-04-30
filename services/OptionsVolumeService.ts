import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OptionsVolumeProvider, OptionsVolumeData } from './providers/OptionsVolumeProvider';
import { SettingsService, settingsEvents } from './SettingsService';

// Add an event emitter to notify components about new options volume data
export const optionsEvents = new EventEmitter();

// Storage keys for background task settings
const STORAGE_KEYS = {
  WATCHED_SYMBOLS: 'options_watched_symbols',
  BACKGROUND_ENABLED: 'options_background_enabled',
  LAST_UPDATE: 'options_last_update',
  OPTIONS_DATA: 'options_data',
};

// Default interval in milliseconds (15 minutes)
const DEFAULT_INTERVAL = 15 * 60 * 1000;

/**
 * Service for managing options volume data and background tasks
 */
export const OptionsVolumeService = (() => {
  // Private variables
  let _provider: OptionsVolumeProvider | null = null;
  let _isInitialized = false;
  let _backgroundTimerId: NodeJS.Timeout | null = null;
  
  // Initialize provider
  const getProvider = (): OptionsVolumeProvider => {
    if (!_provider) {
      _provider = new OptionsVolumeProvider();
    }
    return _provider;
  };
  
  /**
   * Initialize the service
   */
  const initialize = async (): Promise<void> => {
    if (!_isInitialized) {
      // Get provider
      getProvider();
      
      // Check if background fetch is enabled and start it if needed
      const isEnabled = await isBackgroundEnabled();
      if (isEnabled) {
        startBackgroundFetch();
      }
      
      // Set up listeners for settings changes
      setupSettingsListeners();
      
      _isInitialized = true;
    }
  };
  
  /**
   * Set up listeners for settings events
   */
  const setupSettingsListeners = (): void => {
    // Listen for changes to options volume enabled setting
    settingsEvents.on('options-volume-enabled-changed', (enabled: boolean) => {
      if (enabled) {
        startBackgroundFetch();
      } else {
        stopBackgroundFetch();
      }
    });
    
    // Listen for changes to update interval
    settingsEvents.on('options-update-interval-changed', async () => {
      // Restart the background fetch with the new interval
      // Currently using fixed interval, but this would restart with new interval
      // if we implemented variable intervals
      const isEnabled = await isBackgroundEnabled();
      if (isEnabled) {
        stopBackgroundFetch();
        startBackgroundFetch();
      }
    });
  };
  
  /**
   * Start background fetch for options volume data
   * This uses a simple setInterval approach which will only work while the app is in foreground
   * For true background tasks, you would implement registerBackgroundFetchAsync using expo-background-fetch
   */
  const startBackgroundFetch = async (): Promise<void> => {
    // Clear any existing timer
    if (_backgroundTimerId) {
      clearInterval(_backgroundTimerId);
      _backgroundTimerId = null;
    }
    
    // Set up immediate first fetch
    fetchOptionsVolumeData();
    
    // Set up interval for future fetches (every hour)
    _backgroundTimerId = setInterval(() => {
      fetchOptionsVolumeData();
    }, DEFAULT_INTERVAL);
    
    console.log('Started background fetch for options volume data');
  };
  
  /**
   * Stop background fetch
   */
  const stopBackgroundFetch = (): void => {
    if (_backgroundTimerId) {
      clearInterval(_backgroundTimerId);
      _backgroundTimerId = null;
      console.log('Stopped background fetch for options volume data');
    }
  };
  
  /**
   * Fetch options volume data for watched symbols
   */
  const fetchOptionsVolumeData = async (): Promise<void> => {
    try {
      const symbols = await getWatchedSymbols();
      if (symbols.length === 0) {
        console.log('No symbols watched for options volume data');
        return;
      }
      
      console.log(`Fetching options volume data for ${symbols.length} symbols`);
      const provider = getProvider();
      const data = await provider.getBatchOptionsVolume(symbols);
      
      // Save data
      await saveOptionsData(data);
      
      // Emit event to notify components
      optionsEvents.emit('options-data-updated', data);
      
      // Update last fetch time
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE, Date.now().toString());
      
      console.log(`Successfully fetched options volume data for ${data.length} symbols`);
    } catch (error) {
      console.error('Error fetching options volume data:', error);
    }
  };
  
  /**
   * Add a symbol to watched options symbols
   */
  const addWatchedSymbol = async (symbol: string): Promise<void> => {
    try {
      const symbols = await getWatchedSymbols();
      
      // Skip if already watching
      if (symbols.includes(symbol)) {
        return;
      }
      
      // Add symbol to list
      symbols.push(symbol);
      
      // Save updated list
      await AsyncStorage.setItem(STORAGE_KEYS.WATCHED_SYMBOLS, JSON.stringify(symbols));
      
      // Fetch data for new symbol
      const provider = getProvider();
      const data = await provider.getOptionsVolume(symbol);
      
      if (data) {
        // Add to stored data
        const allData = await getOptionsData();
        allData.push(data);
        await saveOptionsData(allData);
        
        // Emit event
        optionsEvents.emit('options-data-updated', allData);
      }
    } catch (error) {
      console.error(`Error adding watched symbol ${symbol}:`, error);
    }
  };
  
  /**
   * Remove a symbol from watched options symbols
   */
  const removeWatchedSymbol = async (symbol: string): Promise<void> => {
    try {
      const symbols = await getWatchedSymbols();
      
      // Filter out the symbol
      const newSymbols = symbols.filter(s => s !== symbol);
      
      // Save updated list
      await AsyncStorage.setItem(STORAGE_KEYS.WATCHED_SYMBOLS, JSON.stringify(newSymbols));
      
      // Remove from stored data
      const allData = await getOptionsData();
      const newData = allData.filter(data => data.symbol !== symbol);
      await saveOptionsData(newData);
      
      // Emit event
      optionsEvents.emit('options-data-updated', newData);
    } catch (error) {
      console.error(`Error removing watched symbol ${symbol}:`, error);
    }
  };
  
  /**
   * Get list of watched symbols for options volume
   */
  const getWatchedSymbols = async (): Promise<string[]> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WATCHED_SYMBOLS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting watched symbols:', error);
      return [];
    }
  };
  
  /**
   * Save options volume data
   */
  const saveOptionsData = async (data: OptionsVolumeData[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OPTIONS_DATA, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving options data:', error);
    }
  };
  
  /**
   * Get stored options volume data
   */
  const getOptionsData = async (): Promise<OptionsVolumeData[]> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OPTIONS_DATA);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting options data:', error);
      return [];
    }
  };
  
  /**
   * Enable or disable background fetch
   */
  const setBackgroundEnabled = async (enabled: boolean): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BACKGROUND_ENABLED, enabled.toString());
      
      if (enabled) {
        startBackgroundFetch();
      } else {
        stopBackgroundFetch();
      }
    } catch (error) {
      console.error('Error setting background enabled:', error);
    }
  };
  
  /**
   * Check if background fetch is enabled
   */
  const isBackgroundEnabled = async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.BACKGROUND_ENABLED);
      return value === 'true';
    } catch (error) {
      console.error('Error checking if background is enabled:', error);
      return false;
    }
  };
  
  /**
   * Get the last update time
   */
  const getLastUpdateTime = async (): Promise<number> => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.LAST_UPDATE);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      console.error('Error getting last update time:', error);
      return 0;
    }
  };
  
  // Public API
  return {
    initialize,
    startBackgroundFetch,
    stopBackgroundFetch,
    fetchOptionsVolumeData,
    addWatchedSymbol,
    removeWatchedSymbol,
    getWatchedSymbols,
    getOptionsData,
    setBackgroundEnabled,
    isBackgroundEnabled,
    getLastUpdateTime,
    optionsEvents // Expose the event emitter
  };
})();
