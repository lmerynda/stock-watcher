import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  TIINGO_API_KEY: "settings_tiingo_api_key",
};

export const SettingsService = {
  /**
   * Set the Tiingo API key
   */
  setTiingoApiKey: async (apiKey: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TIINGO_API_KEY, apiKey);
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
};
