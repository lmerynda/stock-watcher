import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "../ThemedText";
import { StockData } from "@/services/StockService";
import { useThemeColor } from "@/hooks/useThemeColor";

interface StockListItemProps {
  stock: StockData;
  onPress?: () => void;
}

export function StockListItem({ stock, onPress }: StockListItemProps) {
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

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.symbolContainer}>
        <ThemedText style={styles.symbol}>{stock.symbol}</ThemedText>
        <ThemedText style={styles.name} lightColor="#666" darkColor="#AAA">
          {stock.name}
        </ThemedText>
      </View>

      <View style={styles.priceContainer}>
        <ThemedText style={styles.price}>${stock.price.toFixed(2)}</ThemedText>
        <ThemedText style={[styles.change, { color: changeColor }]}>
          {changeSign}
          {stock.change.toFixed(2)} ({changeSign}
          {stock.changePercent.toFixed(2)}%)
        </ThemedText>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  symbolContainer: {
    flex: 1,
  },
  symbol: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  change: {
    fontSize: 14,
  },
});
