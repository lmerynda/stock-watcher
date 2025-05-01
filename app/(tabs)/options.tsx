import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import {
  OptionsVolumeService,
  optionsEvents,
} from "@/services/OptionsVolumeService";
import { OptionsVolumeData } from "@/services/providers/OptionsVolumeProvider";
import { SettingsService } from "@/services/SettingsService";

export default function OptionsVolumeScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [optionsData, setOptionsData] = useState<OptionsVolumeData[]>([]);
  const [watchedSymbols, setWatchedSymbols] = useState<string[]>([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(new Date());

  const inputBackground = useThemeColor(
    { light: "#f1f1f1", dark: "#333333" },
    "background"
  );
  const cardBackground = useThemeColor(
    { light: "#ffffff", dark: "#1c1c1c" },
    "background"
  );
  const buttonBackground = useThemeColor(
    { light: "#2196F3", dark: "#2196F3" },
    "background"
  );
  const textColor = useThemeColor(
    { light: "#000000", dark: "#ffffff" },
    "text"
  );
  const accentColor = useThemeColor(
    { light: "#2196F3", dark: "#2196F3" },
    "text"
  );

  // Load data when the component mounts
  useEffect(() => {
    loadOptionsData();

    // Set up event listener for data updates
    const handleDataUpdate = (data: OptionsVolumeData[]) => {
      setOptionsData(data);
      setLastUpdate(new Date());
    };

    // Subscribe to options data updates using the exposed event emitter
    optionsEvents.addListener("options-data-updated", handleDataUpdate);

    // Clean up listener when component unmounts
    return () => {
      optionsEvents.removeListener("options-data-updated", handleDataUpdate);
    };
  }, []);

  useEffect(() => {
    setLastUpdatedTime(new Date());

    const intervalId = setInterval(() => {
      setLastUpdatedTime(new Date());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const loadOptionsData = async () => {
    setIsLoading(true);
    try {
      // Get background task state
      const enabled = await SettingsService.isOptionsVolumeEnabled();
      setIsEnabled(enabled);

      // Get watched symbols
      const symbols = await OptionsVolumeService.getWatchedSymbols();
      setWatchedSymbols(symbols);

      // Get cached options data
      const data = await OptionsVolumeService.getOptionsData();
      setOptionsData(data);

      // Get last update time
      const lastUpdateTime = await OptionsVolumeService.getLastUpdateTime();
      if (lastUpdateTime > 0) {
        setLastUpdate(new Date(lastUpdateTime));
      }
    } catch (error) {
      console.error("Error loading options volume data:", error);
      Alert.alert("Error", "Failed to load options volume data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await OptionsVolumeService.fetchOptionsVolumeData();

      // Reload all data to ensure everything is in sync
      await loadOptionsData();
    } catch (error) {
      console.error("Error refreshing options volume data:", error);
      Alert.alert("Error", "Failed to refresh options volume data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleBackground = async () => {
    try {
      const newState = !isEnabled;
      await SettingsService.setOptionsVolumeEnabled(newState);
      setIsEnabled(newState);

      if (newState) {
        Alert.alert(
          "Background Updates Enabled",
          "Options volume data will be updated every hour in the background."
        );
        // Force an immediate update when enabled
        handleRefresh();
      } else {
        Alert.alert(
          "Background Updates Disabled",
          "Options volume data will no longer be updated automatically."
        );
      }
    } catch (error) {
      console.error("Error toggling background updates:", error);
      Alert.alert("Error", "Failed to change background update settings");
    }
  };

  const handleAddSymbol = async () => {
    if (!newSymbol.trim()) {
      return;
    }

    const symbol = newSymbol.trim().toUpperCase();

    if (watchedSymbols.includes(symbol)) {
      Alert.alert(
        "Symbol Already Added",
        `${symbol} is already in your watched list.`
      );
      return;
    }

    try {
      await OptionsVolumeService.addWatchedSymbol(symbol);

      // Update UI
      setWatchedSymbols([...watchedSymbols, symbol]);
      setNewSymbol("");

      // Trigger a refresh to get data for the new symbol
      handleRefresh();
    } catch (error) {
      console.error("Error adding symbol:", error);
      Alert.alert(
        "Error",
        "There was a problem adding the symbol to your watched list."
      );
    }
  };

  const handleRemoveSymbol = async (symbol: string) => {
    try {
      await OptionsVolumeService.removeWatchedSymbol(symbol);

      // Update UI
      setWatchedSymbols(watchedSymbols.filter((s) => s !== symbol));
      setOptionsData(optionsData.filter((data) => data.symbol !== symbol));
    } catch (error) {
      console.error("Error removing symbol:", error);
      Alert.alert(
        "Error",
        "There was a problem removing the symbol from your watched list."
      );
    }
  };

  const renderOptionsVolumeItem = ({ item }: { item: OptionsVolumeData }) => {
    const updateTime = new Date(item.timestamp);
    const timeAgo = getTimeAgo(updateTime, lastUpdatedTime);

    return (
      <ThemedView
        style={[styles.optionsCard, { backgroundColor: cardBackground }]}
      >
        <View style={styles.optionsCardHeader}>
          <ThemedText style={styles.symbolText}>{item.symbol}</ThemedText>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveSymbol(item.symbol)}
          >
            <ThemedText style={styles.removeButtonText}>✕</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.optionsDataRow}>
          <ThemedText style={styles.optionsLabel}>Call Volume:</ThemedText>
          <ThemedText style={styles.optionsValue}>
            {item.callVolume.toLocaleString()}
          </ThemedText>
        </View>

        <View style={styles.optionsDataRow}>
          <ThemedText style={styles.optionsLabel}>Put Volume:</ThemedText>
          <ThemedText style={styles.optionsValue}>
            {item.putVolume.toLocaleString()}
          </ThemedText>
        </View>

        <View style={styles.optionsDataRow}>
          <ThemedText style={styles.optionsLabel}>Call/Put Ratio:</ThemedText>
          <ThemedText
            style={[
              styles.optionsValue,
              {
                color:
                  item.callPutRatio > 1.5
                    ? "#4caf50"
                    : item.callPutRatio < 0.75
                    ? "#f44336"
                    : textColor,
              },
            ]}
          >
            {item.callPutRatio.toFixed(2)}
          </ThemedText>
        </View>

        <View style={styles.optionsDataRow}>
          <ThemedText style={styles.optionsLabel}>
            Open Interest (Calls):
          </ThemedText>
          <ThemedText style={styles.optionsValue}>
            {item.callOpenInterest.toLocaleString()}
          </ThemedText>
        </View>

        <View style={styles.optionsDataRow}>
          <ThemedText style={styles.optionsLabel}>
            Open Interest (Puts):
          </ThemedText>
          <ThemedText style={styles.optionsValue}>
            {item.putOpenInterest.toLocaleString()}
          </ThemedText>
        </View>

        <ThemedText style={styles.timeAgoText}>Updated {timeAgo}</ThemedText>
      </ThemedView>
    );
  };

  const getTimeAgo = (date: Date, now: Date): string => {
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);

    if (diffSec < 60) {
      return `${diffSec} second${diffSec !== 1 ? "s" : ""} ago`;
    }
    if (diffMin < 60) {
      return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
    }
    if (diffHour < 24) {
      return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
    }

    return date.toLocaleDateString();
  };

  const renderEmptyState = () => (
    <ThemedView style={styles.emptyContainer}>
      {watchedSymbols.length === 0 ? (
        <>
          <ThemedText style={styles.emptyTitle}>No Symbols Added</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            Add stock symbols above to track options volume data.
          </ThemedText>
        </>
      ) : (
        <>
          <ThemedText style={styles.emptyTitle}>No Data Available</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            Pull down to refresh or wait for the next background update.
          </ThemedText>
        </>
      )}
    </ThemedView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Options Volume</ThemedText>
      </ThemedView>

      <ThemedView style={styles.content}>
        {/* Background Toggle Switch */}
        <TouchableOpacity
          style={[
            styles.toggleButton,
            { backgroundColor: isEnabled ? "#4caf50" : "#f44336" },
          ]}
          onPress={handleToggleBackground}
        >
          <ThemedText style={styles.toggleButtonText}>
            {isEnabled ? "Background Updates: ON" : "Background Updates: OFF"}
          </ThemedText>
        </TouchableOpacity>

        {/* Last Update Information */}
        {lastUpdate && (
          <ThemedText style={styles.lastUpdateText}>
            Last update: {lastUpdate.toLocaleString()}
          </ThemedText>
        )}

        {/* Add Symbol Input */}
        <View style={styles.addSymbolRow}>
          <TextInput
            style={[
              styles.symbolInput,
              { backgroundColor: inputBackground, color: textColor },
            ]}
            value={newSymbol}
            onChangeText={setNewSymbol}
            placeholder="Enter symbol (e.g. AAPL)"
            placeholderTextColor="#888888"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: buttonBackground },
              !newSymbol.trim() && styles.disabledButton,
            ]}
            onPress={handleAddSymbol}
            disabled={!newSymbol.trim()}
          >
            <ThemedText style={styles.buttonText}>Add</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Options Volume Data List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accentColor} />
            <ThemedText style={styles.loadingText}>
              Loading options data...
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={optionsData}
            keyExtractor={(item) => item.symbol}
            renderItem={renderOptionsVolumeItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[accentColor]}
                tintColor={accentColor}
              />
            }
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  toggleButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  toggleButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  lastUpdateText: {
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
    fontStyle: "italic",
  },
  addSymbolRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  symbolInput: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginRight: 8,
  },
  addButton: {
    width: 80,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  optionsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionsCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    paddingBottom: 8,
  },
  symbolText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ff6b6b",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  optionsDataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  optionsLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  optionsValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  timeAgoText: {
    fontSize: 12,
    fontStyle: "italic",
    opacity: 0.6,
    marginTop: 8,
    textAlign: "right",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
