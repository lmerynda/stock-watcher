import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OptionsVolumeProvider, OptionsVolumeData } from './providers/OptionsVolumeProvider';
import SettingsService from './SettingsService';
import { dbService } from './DatabaseService';
import { NotificationService } from './NotificationService';

// Add an event emitter to notify components about new options volume data
export const optionsEvents = new EventEmitter();

// Storage keys for background task settings
const STORAGE_KEYS = {
  WATCHED_SYMBOLS: 'options_watched_symbols',
  BACKGROUND_ENABLED: 'options_background_enabled',
  LAST_UPDATE: 'options_last_update',
  NOTIFICATIONS_ENABLED: 'options_notifications_enabled',
};

// Default interval in milliseconds (10 minutes for time series data)
const DEFAULT_INTERVAL = 1 * 60 * 1000;

/**
 * Service for managing options volume data and background tasks
 */
export const OptionsVolumeService = (() => {
  // Private variables
  let _provider: OptionsVolumeProvider | null = null;
  let _isInitialized = false;
  let _backgroundTimerId: NodeJS.Timeout | null = null;
  let _notificationsPermissionGranted = false;
  
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
      // Initialize provider
      getProvider();
      
      // Initialize database
      await dbService.initialize();
      
      // Request notification permissions
      _notificationsPermissionGranted = await NotificationService.requestPermissions();
      
      // Check if background fetch is enabled and start it if needed
      const isEnabled = await isBackgroundEnabled();
      if (isEnabled) {
        startBackgroundFetch();
      }
      
      // Set up listeners for settings changes
      setupSettingsListeners();
      
      // Schedule daily purge of old data
      scheduleDataPurge();
      
      _isInitialized = true;
    }
  };
  
  /**
   * Set up listeners for settings events
   */
  const setupSettingsListeners = (): void => {
    // Listen for changes to options volume enabled setting
    SettingsService.subscribe<boolean>(
      'OPTIONS_VOLUME_ENABLED',
      (enabled) => {
        if (enabled) {
          startBackgroundFetch();
        } else {
          stopBackgroundFetch();
        }
      }
    );
    
    // Listen for changes to update interval
    SettingsService.subscribe<number>(
      'OPTIONS_UPDATE_INTERVAL',
      async () => {
        const isEnabled = await isBackgroundEnabled();
        if (isEnabled) {
          stopBackgroundFetch();
          startBackgroundFetch();
        }
      }
    );
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
    
    // Set up interval for future fetches (every 10 minutes)
    _backgroundTimerId = setInterval(() => {
      fetchOptionsVolumeData();
    }, DEFAULT_INTERVAL);
    
    console.log('Started background fetch for options volume data (every 10 minutes)');
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
   * Schedule daily purge of old data (older than 7 days)
   */
  const scheduleDataPurge = (): void => {
    // Run once a day at midnight
    const now = new Date();
    const night = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // tomorrow
      0, 0, 0 // midnight
    );
    const timeToMidnight = night.getTime() - now.getTime();
    
    // Schedule first purge for midnight
    setTimeout(() => {
      // Purge old data
      dbService.purgeOldData();
      
      // Then schedule to run every 24 hours
      setInterval(() => {
        dbService.purgeOldData();
      }, 24 * 60 * 60 * 1000);
    }, timeToMidnight);
    
    console.log(`Scheduled daily data purge to run in ${Math.round(timeToMidnight / 3600000)} hours`);
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
      
      // Save data to SQLite database
      await dbService.saveOptionsVolumeBatch(data);
      
      // Emit event to notify components
      optionsEvents.emit('options-data-updated', data);
      
      // Update last fetch time
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE, Date.now().toString());
      
      // Check for alert conditions if notifications are enabled
      const notificationsEnabled = await areNotificationsEnabled();
      if (notificationsEnabled && _notificationsPermissionGranted) {
        for (const symbol of symbols) {
          await NotificationService.checkVolumeAlerts(symbol);
        }
      }
      
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
        // Save to database
        await dbService.saveOptionsVolumeData(data);
        
        // Emit event with latest data for all symbols
        const allData = await getLatestOptionsData();
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
      
      // Get and emit latest data for remaining symbols
      const allData = await getLatestOptionsData();
      optionsEvents.emit('options-data-updated', allData);
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
   * Get latest options data for all watched symbols
   */
  const getLatestOptionsData = async (): Promise<OptionsVolumeData[]> => {
    try {
      const symbols = await getWatchedSymbols();
      const endTime = Date.now();
      const startTime = endTime - DEFAULT_INTERVAL; // Only get most recent data
      
      const allData: OptionsVolumeData[] = [];
      
      for (const symbol of symbols) {
        const data = await dbService.getOptionsVolumeHistory(symbol, startTime, endTime);
        if (data.length > 0) {
          // Get the most recent data point
          allData.push(data[data.length - 1]);
        }
      }
      
      return allData;
    } catch (error) {
      console.error('Error getting latest options data:', error);
      return [];
    }
  };
  
  /**
   * Get historical options data for a symbol
   */
  const getOptionsVolumeHistory = async (
    symbol: string,
    days: number = 1
  ): Promise<OptionsVolumeData[]> => {
    try {
      const endTime = Date.now();
      const startTime = endTime - (days * 24 * 60 * 60 * 1000);
      
      return await dbService.getOptionsVolumeHistory(symbol, startTime, endTime);
    } catch (error) {
      console.error(`Error getting options volume history for ${symbol}:`, error);
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
   * Enable or disable notifications
   */
  const setNotificationsEnabled = async (enabled: boolean): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, enabled.toString());
      
      // Request permissions if enabling notifications
      if (enabled) {
        _notificationsPermissionGranted = await NotificationService.requestPermissions();
      }
    } catch (error) {
      console.error('Error setting notifications enabled:', error);
    }
  };
  
  /**
   * Check if notifications are enabled
   */
  const areNotificationsEnabled = async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
      return value === 'true';
    } catch (error) {
      console.error('Error checking if notifications are enabled:', error);
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
    getOptionsVolumeHistory,
    getLatestOptionsData,
    setBackgroundEnabled,
    isBackgroundEnabled,
    setNotificationsEnabled,
    areNotificationsEnabled,
    getLastUpdateTime
  };
})();
