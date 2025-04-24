import React, { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StockData, StockService } from "@/services/StockService";
import { StockListItem } from "@/components/stocks/StockListItem";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { router } from "expo-router";
import { IconSymbol } from "@/components/ui/IconSymbol";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WATCHLIST_STORAGE_KEY = "watchlist_symbols";

// Default stocks to show if watchlist is empty
const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "META"];

export default function WatchlistScreen() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);

  // Function to load watchlist symbols from storage
  const loadWatchlistSymbols = async () => {
    try {
      const storedSymbols = await AsyncStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (storedSymbols) {
        return JSON.parse(storedSymbols) as string[];
      }
      // Use default symbols if none are stored
      return DEFAULT_SYMBOLS;
    } catch (error) {
      console.error("Error loading watchlist:", error);
      return DEFAULT_SYMBOLS;
    }
  };

  // Function to save watchlist symbols to storage
  const saveWatchlistSymbols = async (symbols: string[]) => {
    try {
      await AsyncStorage.setItem(
        WATCHLIST_STORAGE_KEY,
        JSON.stringify(symbols)
      );
    } catch (error) {
      console.error("Error saving watchlist:", error);
    }
  };

  // Function to remove a stock from watchlist
  const removeFromWatchlist = async (symbol: string) => {
    const updatedSymbols = watchlistSymbols.filter((s) => s !== symbol);
    setWatchlistSymbols(updatedSymbols);
    await saveWatchlistSymbols(updatedSymbols);
    setStocks(stocks.filter((stock) => stock.symbol !== symbol));
  };

  // Load watchlist data
  useEffect(() => {
    const fetchWatchlistData = async () => {
      setIsLoading(true);
      try {
        const symbols = await loadWatchlistSymbols();
        setWatchlistSymbols(symbols);

        if (symbols.length > 0) {
          const stockData = await StockService.getBatchQuotes(symbols);
          setStocks(stockData);
        }
      } catch (error) {
        console.error("Error fetching watchlist data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWatchlistData();

    // Refresh data every 30 seconds
    const intervalId = setInterval(async () => {
      if (watchlistSymbols.length > 0) {
        try {
          const stockData = await StockService.getBatchQuotes(watchlistSymbols);
          setStocks(stockData);
        } catch (error) {
          console.error("Error refreshing watchlist data:", error);
        }
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [watchlistSymbols.length]);

  const renderHeader = () => (
    <ThemedView style={styles.header}>
      <ThemedText style={styles.title}>My Watchlist</ThemedText>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/explore")}
      >
        <IconSymbol name="plus" size={20} color="#fff" />
      </TouchableOpacity>
    </ThemedView>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <ThemedText style={styles.loadingText}>Loading stocks...</ThemedText>
      </SafeAreaView>
    );
  }

  if (stocks.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>
            Your watchlist is empty. Tap the + button to add stocks.
          </ThemedText>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push("/explore")}
          >
            <ThemedText style={styles.exploreButtonText}>
              Explore Stocks
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={stocks}
        keyExtractor={(item) => item.symbol}
        renderItem={({ item }) => (
          <StockListItem
            stock={item}
            onPress={() => {
              // Navigate to stock details (to be implemented)
              // router.push(`/stock/${item.symbol}`);
            }}
          />
        )}
        ListHeaderComponent={renderHeader}
        refreshing={isLoading}
        onRefresh={async () => {
          setIsLoading(true);
          try {
            const stockData = await StockService.getBatchQuotes(
              watchlistSymbols
            );
            setStocks(stockData);
          } catch (error) {
            console.error("Error refreshing watchlist data:", error);
          } finally {
            setIsLoading(false);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: "#2196F3",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
