import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StockSearch } from "@/components/stocks/StockSearch";
import { StockCard } from "@/components/stocks/StockCard";
import { StockData, stockEvents } from "@/services/StockService";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IconSymbol } from "@/components/ui/IconSymbol";

const WATCHLIST_STORAGE_KEY = "watchlist_symbols";

export default function ExploreScreen() {
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);

  // Function to add a stock to the watchlist
  const addToWatchlist = async (stock: StockData) => {
    try {
      // Get current watchlist
      const storedSymbols = await AsyncStorage.getItem(WATCHLIST_STORAGE_KEY);
      let watchlistSymbols: string[] = storedSymbols
        ? JSON.parse(storedSymbols)
        : [];

      // Check if stock already exists in watchlist
      if (watchlistSymbols.includes(stock.symbol)) {
        Alert.alert(
          "Already in Watchlist",
          `${stock.symbol} is already in your watchlist.`
        );
        return;
      }

      // Add the stock and save
      watchlistSymbols.push(stock.symbol);
      await AsyncStorage.setItem(
        WATCHLIST_STORAGE_KEY,
        JSON.stringify(watchlistSymbols)
      );

      // Emit an event to notify the watchlist screen
      stockEvents.emit("watchlistUpdated", watchlistSymbols);

      console.log(
        `Added to Watchlist: ${stock.symbol} has been added to your watchlist.`
      );
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      Alert.alert("Error", "Failed to add stock to watchlist.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Explore Stocks</ThemedText>
      </ThemedView>

      <StockSearch onSelectStock={setSelectedStock} />

      {selectedStock && (
        <ThemedView style={styles.selectedStockContainer}>
          <StockCard stock={selectedStock} />

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addToWatchlist(selectedStock)}
          >
            <IconSymbol
              name="plus"
              size={20}
              color="#fff"
              style={styles.buttonIcon}
            />
            <ThemedText style={styles.buttonText}>Add to Watchlist</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}

      {!selectedStock && (
        <ThemedView style={styles.placeholderContainer}>
          <ThemedText style={styles.placeholderText}>
            Search for a stock symbol above to see details
          </ThemedText>
          <ThemedText style={styles.exampleText}>
            Examples: AAPL, MSFT, TSLA, AMZN, GOOG
          </ThemedText>
        </ThemedView>
      )}
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
  selectedStockContainer: {
    margin: 16,
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#2196F3",
    borderRadius: 8,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  exampleText: {
    fontSize: 14,
    opacity: 0.7,
  },
});
