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
  Switch,
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
import { OptionsVolumeChart } from "@/components/stocks/OptionsVolumeChart";

export default function OptionsVolumeScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [optionsData, setOptionsData] = useState<OptionsVolumeData[]>([]);
  const [watchedSymbols, setWatchedSymbols] = useState<string[]>([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isBackgroundEnabled, setIsBackgroundEnabled] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "1d" | "3d" | "7d"
  >("1d");
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

    // Subscribe to options data updates
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
      const backgroundEnabled =
        await OptionsVolumeService.isBackgroundEnabled();
      setIsBackgroundEnabled(backgroundEnabled);

      // Get notifications state
      const notificationsEnabled =
        await OptionsVolumeService.areNotificationsEnabled();
      setIsNotificationsEnabled(notificationsEnabled);

      // Get watched symbols
      const symbols = await OptionsVolumeService.getWatchedSymbols();
      setWatchedSymbols(symbols);

      // Get cached options data
      const data = await OptionsVolumeService.getLatestOptionsData();
      setOptionsData(data);

      // Do not auto-select a symbol; initial view will list symbols

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
      const newState = !isBackgroundEnabled;
      await OptionsVolumeService.setBackgroundEnabled(newState);
      setIsBackgroundEnabled(newState);

      if (newState) {
        Alert.alert(
          "Background Updates Enabled",
          "Options volume data will be updated every 10 minutes in the background."
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

  const handleToggleNotifications = async () => {
    try {
      const newState = !isNotificationsEnabled;
      await OptionsVolumeService.setNotificationsEnabled(newState);
      setIsNotificationsEnabled(newState);

      if (newState) {
        Alert.alert(
          "Notifications Enabled",
          "You will receive alerts when unusual options activity is detected."
        );
      } else {
        Alert.alert(
          "Notifications Disabled",
          "You will no longer receive alerts about options activity."
        );
      }
    } catch (error) {
      console.error("Error toggling notifications:", error);
      Alert.alert("Error", "Failed to change notification settings");
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
      setWatchedSymbols([...watchedSymbols, symbol]);
      setNewSymbol("");

      // Set as selected symbol if no symbol is selected
      if (!selectedSymbol) {
        setSelectedSymbol(symbol);
      }

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
      const newSymbols = watchedSymbols.filter((s) => s !== symbol);
      setWatchedSymbols(newSymbols);
      setOptionsData(optionsData.filter((data) => data.symbol !== symbol));

      // If the removed symbol was selected, select another one
      if (selectedSymbol === symbol) {
        setSelectedSymbol(newSymbols.length > 0 ? newSymbols[0] : null);
      }
    } catch (error) {
      console.error("Error removing symbol:", error);
      Alert.alert(
        "Error",
        "There was a problem removing the symbol from your watched list."
      );
    }
  };

  const handleFetchData = async () => {
    try {
      setIsLoading(true);
      await OptionsVolumeService.fetchOptionsVolumeData();
      await loadOptionsData();
      Alert.alert(
        "Data Updated",
        "Successfully fetched the latest options data."
      );
    } catch (error) {
      console.error("Error fetching options data:", error);
      Alert.alert("Error", "Failed to fetch options data");
    } finally {
      setIsLoading(false);
    }
  };

  const renderTimeRangeSelector = () => (
    <ThemedView style={styles.timeRangeSelector}>
      <TouchableOpacity
        style={[
          styles.timeRangeButton,
          selectedTimeRange === "1d" && styles.timeRangeButtonSelected,
        ]}
        onPress={() => setSelectedTimeRange("1d")}
      >
        <ThemedText
          style={[
            styles.timeRangeButtonText,
            selectedTimeRange === "1d" && styles.timeRangeButtonTextSelected,
          ]}
        >
          1D
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.timeRangeButton,
          selectedTimeRange === "3d" && styles.timeRangeButtonSelected,
        ]}
        onPress={() => setSelectedTimeRange("3d")}
      >
        <ThemedText
          style={[
            styles.timeRangeButtonText,
            selectedTimeRange === "3d" && styles.timeRangeButtonTextSelected,
          ]}
        >
          3D
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.timeRangeButton,
          selectedTimeRange === "7d" && styles.timeRangeButtonSelected,
        ]}
        onPress={() => setSelectedTimeRange("7d")}
      >
        <ThemedText
          style={[
            styles.timeRangeButtonText,
            selectedTimeRange === "7d" && styles.timeRangeButtonTextSelected,
          ]}
        >
          7D
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  const renderOptionsVolumeItem = ({ item }: { item: OptionsVolumeData }) => {
    const updateTime = new Date(item.timestamp);
    const timeAgo = getTimeAgo(updateTime, lastUpdatedTime);
    const isSelected = selectedSymbol === item.symbol;

    return (
      <TouchableOpacity
        onPress={() => setSelectedSymbol(item.symbol)}
        activeOpacity={0.7}
      >
        <ThemedView
          style={[
            styles.optionsCard,
            { backgroundColor: cardBackground },
            isSelected && styles.selectedCard,
          ]}
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

          <ThemedText style={styles.timeAgoText}>Updated {timeAgo}</ThemedText>
        </ThemedView>
      </TouchableOpacity>
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
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <ThemedText style={styles.loadingText}>
            Loading options data...
          </ThemedText>
        </View>
      ) : selectedSymbol == null ? (
        <FlatList
          data={watchedSymbols}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.symbolListItem}
              onPress={() => setSelectedSymbol(item)}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.symbolListText}>{item}</ThemedText>
            </TouchableOpacity>
          )}
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
      ) : (
        <View style={styles.mainContainer}>
          <View style={styles.headerSection}>
            {selectedSymbol && (
              <TouchableOpacity
                onPress={() => setSelectedSymbol(null)}
                style={{ marginBottom: 8 }}
              >
                <ThemedText style={{ color: accentColor }}>
                  {"< Back"}
                </ThemedText>
              </TouchableOpacity>
            )}
            <ThemedView style={styles.header}>
              <ThemedText style={styles.title}>
                {selectedSymbol ? selectedSymbol : "Options Volume"}
              </ThemedText>
            </ThemedView>

            {/* Fetch Data Button */}
            <TouchableOpacity
              style={[
                styles.fetchButton,
                { backgroundColor: buttonBackground },
              ]}
              onPress={handleFetchData}
            >
              <ThemedText style={styles.fetchButtonText}>
                Fetch Options Data
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

            {/* Chart Section */}
            {selectedSymbol && (
              <ThemedView
                style={[
                  styles.chartContainer,
                  { backgroundColor: cardBackground },
                ]}
              >
                {renderTimeRangeSelector()}
                <OptionsVolumeChart
                  symbol={selectedSymbol}
                  timeRange={selectedTimeRange}
                />
              </ThemedView>
            )}

            <ThemedText style={styles.sectionTitle}>Watched Symbols</ThemedText>
          </View>

          {/* Options Volume Data List - Now separate from ScrollView */}
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
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 16,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
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
  chartContainer: {
    marginBottom: 24,
    borderRadius: 12,
    padding: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timeRangeSelector: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  timeRangeButtonSelected: {
    backgroundColor: "#2196F3",
  },
  timeRangeButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  timeRangeButtonTextSelected: {
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
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
  selectedCard: {
    borderWidth: 2,
    borderColor: "#2196F3",
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
    paddingVertical: 32,
    justifyContent: "center",
    alignItems: "center",
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
  symbolListItem: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  symbolListText: {
    fontSize: 16,
  },
  fetchButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  fetchButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});
