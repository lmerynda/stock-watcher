import AsyncStorage from "@react-native-async-storage/async-storage";
import { StockService } from "./StockService";

export enum DataProvider {
  TIINGO = "tiingo",
  DUMMY = "dummy",
}

const STORAGE_KEYS = {
  TIINGO_API_KEY: "settings_tiingo_api_key",
  DATA_PROVIDER: "settings_data_provider",
  OPTIONS_VOLUME_ENABLED: "settings_options_volume_enabled",
  OPTIONS_UPDATE_INTERVAL: "settings_options_update_interval",
};

type Listener<T> = (newValue: T, oldValue: T) => void;

class SettingsService {
  private static instance: SettingsService;
  private store: Record<string, any> = {};
  private listeners: Record<string, Set<Listener<any>>> = {};

  private constructor() {}

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  async loadAll(): Promise<void> {
    const entries = Object.entries(STORAGE_KEYS) as [keyof typeof STORAGE_KEYS, string][];
    for (const [_, storageKey] of entries) {
      const value = await AsyncStorage.getItem(storageKey);
      if (value !== null) {
        if (storageKey === STORAGE_KEYS.OPTIONS_VOLUME_ENABLED) {
          this.store[storageKey] = value === "true";
        } else if (storageKey === STORAGE_KEYS.OPTIONS_UPDATE_INTERVAL) {
          this.store[storageKey] = parseInt(value, 10);
        } else {
          this.store[storageKey] = value;
        }
      }
    }
  }

  get<T>(key: keyof typeof STORAGE_KEYS, defaultValue: T): T {
    const storageKey = STORAGE_KEYS[key];
    const value = this.store[storageKey];
    return value !== undefined ? (value as T) : defaultValue;
  }

  async set<T>(key: keyof typeof STORAGE_KEYS, value: T): Promise<void> {
    const storageKey = STORAGE_KEYS[key];
    const oldValue = this.store[storageKey];
    this.store[storageKey] = value;
    const toStore =
      typeof value === "boolean" || typeof value === "number"
        ? value.toString()
        : (value as unknown as string);
    await AsyncStorage.setItem(storageKey, toStore);
    if (key === "TIINGO_API_KEY" || key === "DATA_PROVIDER") {
      await StockService.resetProvider();
    }
    this.notify(storageKey, value, oldValue);
  }

  subscribe<T>(key: keyof typeof STORAGE_KEYS, listener: Listener<T>): void {
    const storageKey = STORAGE_KEYS[key];
    if (!this.listeners[storageKey]) {
      this.listeners[storageKey] = new Set();
    }
    this.listeners[storageKey]!.add(listener as Listener<any>);
  }

  unsubscribe<T>(key: keyof typeof STORAGE_KEYS, listener: Listener<T>): void {
    const storageKey = STORAGE_KEYS[key];
    this.listeners[storageKey]?.delete(listener as Listener<any>);
  }

  /**
   * Convenience: get the stored Tiingo API key
   */
  async getTiingoApiKey(): Promise<string> {
    return this.get("TIINGO_API_KEY", "");
  }

  /**
   * Convenience: set the Tiingo API key
   */
  async setTiingoApiKey(apiKey: string): Promise<void> {
    await this.set("TIINGO_API_KEY", apiKey);
  }

  /**
   * Convenience: check if using dummy data provider
   */
  async isUsingDummyProvider(): Promise<boolean> {
    return this.get("DATA_PROVIDER", DataProvider.DUMMY) === DataProvider.DUMMY;
  }

  /**
   * Convenience: set the data provider
   */
  async setDataProvider(provider: DataProvider): Promise<void> {
    await this.set("DATA_PROVIDER", provider);
  }

  private notify<T>(
    storageKey: string,
    newValue: T,
    oldValue: T
  ): void {
    this.listeners[storageKey]?.forEach((listener) =>
      listener(newValue, oldValue)
    );
  }
}

export { settingsService as SettingsService };
const settingsService = SettingsService.getInstance();
export default settingsService;
export { STORAGE_KEYS };
