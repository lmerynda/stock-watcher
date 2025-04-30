import AsyncStorage from "@react-native-async-storage/async-storage";
import { EventEmitter } from "events";
import { StockService } from "./StockService";

// Define available data providers
export enum DataProvider {
  TIINGO = "tiingo",
  DUMMY = "dummy"
}

// Create an event emitter for settings changes
export const settingsEvents = new EventEmitter();

const STORAGE_KEYS = {
  TIINGO_API_KEY: "settings_tiingo_api_key",
  DATA_PROVIDER: "settings_data_provider",
  OPTIONS_VOLUME_ENABLED: "settings_options_volume_enabled",
  OPTIONS_UPDATE_INTERVAL: "settings_options_update_interval",
};

export const SettingsService = {
  /**
   * Set the Tiingo API key
   */
  setTiingoApiKey: async (apiKey: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TIINGO_API_KEY, apiKey);
      // Reset the provider after changing the API key
      await StockService.resetProvider();
    } catch (error) {
      console.error("Error saving Tiingo API key:", error);
      throw error;
    }
  },

  /**
   * Get the stored Tiingo API key
   */
  getTiingoApiKey: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.TIINGO_API_KEY);
    } catch (error) {
      console.error("Error retrieving Tiingo API key:", error);
      return null;
    }
  },

  /**
   * Check if the Tiingo API key is set
   */
  hasTiingoApiKey: async (): Promise<boolean> => {
    const apiKey = await SettingsService.getTiingoApiKey();
    return apiKey !== null && apiKey.trim() !== "";
  },

  /**
   * Set the data provider to use (Tiingo or Dummy)
   */
  setDataProvider: async (provider: DataProvider): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DATA_PROVIDER, provider);
      // Reset the provider after changing the data provider
      await StockService.resetProvider();
    } catch (error) {
      console.error("Error saving data provider setting:", error);
      throw error;
    }
  },

  /**
   * Get the current data provider setting
   * Default to Dummy if not set
   */
  getDataProvider: async (): Promise<DataProvider> => {
    try {
      const provider = await AsyncStorage.getItem(STORAGE_KEYS.DATA_PROVIDER);
      return (provider as DataProvider) || DataProvider.DUMMY;
    } catch (error) {
      console.error("Error retrieving data provider setting:", error);
      return DataProvider.DUMMY;
    }
  },

  /**
   * Check if the dummy data provider is being used
   */
  isUsingDummyProvider: async (): Promise<boolean> => {
    const provider = await SettingsService.getDataProvider();
    return provider === DataProvider.DUMMY;
  },

  /**
   * Enable or disable options volume background updates
   */
  setOptionsVolumeEnabled: async (enabled: boolean): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OPTIONS_VOLUME_ENABLED, enabled.toString());
      // Emit an event that OptionsVolumeService can listen for
      settingsEvents.emit('options-volume-enabled-changed', enabled);
    } catch (error) {
      console.error("Error saving options volume enabled setting:", error);
      throw error;
    }
  },

  /**
   * Check if options volume background updates are enabled
   */
  isOptionsVolumeEnabled: async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.OPTIONS_VOLUME_ENABLED);
      return value === "true";
    } catch (error) {
      console.error("Error retrieving options volume enabled setting:", error);
      return false;
    }
  },

  /**
   * Set the update interval for options volume (in minutes)
   * Note: Currently the implementation has a fixed 1-hour interval
   */
  setOptionsUpdateInterval: async (minutes: number): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OPTIONS_UPDATE_INTERVAL, minutes.toString());
      // Emit an event that OptionsVolumeService can listen for
      settingsEvents.emit('options-update-interval-changed', minutes);
    } catch (error) {
      console.error("Error saving options update interval:", error);
      throw error;
    }
  },

  /**
   * Get the update interval for options volume (in minutes)
   * Default is 60 minutes (1 hour) if not set
   */
  getOptionsUpdateInterval: async (): Promise<number> => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.OPTIONS_UPDATE_INTERVAL);
      return value ? parseInt(value, 10) : 60;
    } catch (error) {
      console.error("Error retrieving options update interval:", error);
      return 60;
    }
  },
};
