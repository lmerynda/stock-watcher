import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { ThemedText } from "../ThemedText";
import { ThemedView } from "../ThemedView";
import { StockData } from "@/services/StockService";
import { useThemeColor } from "@/hooks/useThemeColor";

interface StockCardProps {
  stock: StockData;
  style?: ViewStyle;
}

export function StockCard({ stock, style }: StockCardProps) {
  const positiveColor = useThemeColor(
    { light: "#4CAF50", dark: "#81C784" },
    "tint"
  );
  const negativeColor = useThemeColor(
    { light: "#F44336", dark: "#E57373" },
    "icon"
  );

  const isPositive = stock.change >= 0;
  const changeColor = isPositive ? positiveColor : negativeColor;
  const changeSign = isPositive ? "+" : "";

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(2)}B`;
    } else if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(2)}M`;
    } else if (num >= 1_000) {
      return `${(num / 1_000).toFixed(2)}K`;
    }
    return num.toString();
  };

  return (
    <ThemedView style={[styles.container, style]}>
      <View style={styles.header}>
        <ThemedText style={styles.symbol}>{stock.symbol}</ThemedText>
        <ThemedText style={styles.price}>${stock.price.toFixed(2)}</ThemedText>
      </View>

      <ThemedText style={styles.name}>{stock.name}</ThemedText>

      <View style={styles.changeContainer}>
        <ThemedText style={[styles.change, { color: changeColor }]}>
          {changeSign}
          {stock.change.toFixed(2)} ({changeSign}
          {stock.changePercent.toFixed(2)}%)
        </ThemedText>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <ThemedText style={styles.metricLabel}>Volume</ThemedText>
          <ThemedText style={styles.metricValue}>
            {formatNumber(stock.volume)}
          </ThemedText>
        </View>

        {stock.marketCap && (
          <View style={styles.metric}>
            <ThemedText style={styles.metricLabel}>Market Cap</ThemedText>
            <ThemedText style={styles.metricValue}>
              {formatNumber(stock.marketCap)}
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  symbol: {
    fontSize: 24,
    fontWeight: "bold",
  },
  name: {
    fontSize: 16,
    marginBottom: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: "bold",
  },
  changeContainer: {
    marginBottom: 16,
  },
  change: {
    fontSize: 16,
    fontWeight: "600",
  },
  metrics: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "600",
  },
});
