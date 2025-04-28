import AsyncStorage from "@react-native-async-storage/async-storage";
import { StockService } from "./StockService";

// Define available data providers
export enum DataProvider {
  TIINGO = "tiingo",
  DUMMY = "dummy"
}

const STORAGE_KEYS = {
  TIINGO_API_KEY: "settings_tiingo_api_key",
  DATA_PROVIDER: "settings_data_provider",
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
};
