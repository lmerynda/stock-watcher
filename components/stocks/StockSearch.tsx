import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "../ThemedText";
import { ThemedView } from "../ThemedView";
import { StockData, StockService } from "@/services/StockService";
import { IconSymbol } from "../ui/IconSymbol";
import { useThemeColor } from "@/hooks/useThemeColor";

interface StockSearchProps {
  onSelectStock?: (stock: StockData) => void;
}

export function StockSearch({ onSelectStock }: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const inputBackground = useThemeColor(
    { light: "#f1f1f1", dark: "#333333" },
    "background"
  );
  const placeholderColor = useThemeColor(
    { light: "#888888", dark: "#888888" },
    "text"
  );
  const infoColor = useThemeColor(
    { light: "#5B9BD5", dark: "#5B9BD5" },
    "text"
  );

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const results = await StockService.searchStocks(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching stocks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStock = async (stock: StockData) => {
    setIsLoading(true);
    try {
      const stockData = await StockService.getStockQuote(stock.symbol);
      if (stockData && onSelectStock) {
        onSelectStock(stockData);
      }
    } catch (error) {
      console.error("Error fetching stock data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: inputBackground }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search stocks (e.g., AAPL, MSFT, GOOG)"
          placeholderTextColor={placeholderColor}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <IconSymbol name="magnifyingglass" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ThemedText style={[styles.demoNote, { color: infoColor }]}>
        Note: Using demo data. Try searching for: AAPL, MSFT, GOOGL, AMZN, META,
        TSLA, NVDA, NFLX, JPM, V
      </ThemedText>

      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.symbol}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => handleSelectStock(item)}
            >
              <ThemedText style={styles.resultSymbol}>{item.symbol}</ThemedText>
              <ThemedText style={styles.resultName}>{item.name}</ThemedText>
            </TouchableOpacity>
          )}
          style={styles.resultsList}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  searchButton: {
    width: 48,
    height: 48,
    backgroundColor: "#2196F3",
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  demoNote: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
    fontStyle: "italic",
  },
  resultsList: {
    marginTop: 16,
    maxHeight: 300,
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  resultSymbol: {
    fontSize: 16,
    fontWeight: "bold",
  },
  resultName: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.7,
  },
});
