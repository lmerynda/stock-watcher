import React, { useEffect, useState } from "react";
import { View, Dimensions, StyleSheet, ActivityIndicator } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { ThemedText } from "../ThemedText";
import { ThemedView } from "../ThemedView";
import { dbService } from "@/services/DatabaseService";
import { OptionsVolumeData } from "@/services/providers/OptionsVolumeProvider";
import { useThemeColor } from "@/hooks/useThemeColor";

interface OptionsVolumeChartProps {
  symbol: string;
  timeRange: "1d" | "3d" | "7d"; // 1 day, 3 days, or 7 days
}

export const OptionsVolumeChart: React.FC<OptionsVolumeChartProps> = ({
  symbol,
  timeRange,
}) => {
  const [volumeData, setVolumeData] = useState<OptionsVolumeData[]>([]);
  const [loading, setLoading] = useState(true);

  const chartBackground = useThemeColor(
    { light: "#1e88e5", dark: "#0d47a1" },
    "background"
  );

  const chartBackgroundGradientFrom = useThemeColor(
    { light: "#42a5f5", dark: "#1565c0" },
    "background"
  );

  const chartBackgroundGradientTo = useThemeColor(
    { light: "#1565c0", dark: "#002171" },
    "background"
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const endTime = Date.now();
        let startTime: number;

        // Set start time based on timeRange
        switch (timeRange) {
          case "1d":
            startTime = endTime - 24 * 60 * 60 * 1000; // 1 day
            break;
          case "3d":
            startTime = endTime - 3 * 24 * 60 * 60 * 1000; // 3 days
            break;
          case "7d":
          default:
            startTime = endTime - 7 * 24 * 60 * 60 * 1000; // 7 days
            break;
        }

        const data = await dbService.getOptionsVolumeHistory(
          symbol,
          startTime,
          endTime
        );
        setVolumeData(data);
      } catch (error) {
        console.error(`Error fetching chart data for ${symbol}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, timeRange]);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <ThemedText style={styles.loadingText}>
          Loading chart data...
        </ThemedText>
      </ThemedView>
    );
  }

  if (volumeData.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>
          No data available for {symbol} in the selected time range.
        </ThemedText>
        <ThemedText style={styles.emptySubtext}>
          Data is collected every 10 minutes when background updates are
          enabled.
        </ThemedText>
      </ThemedView>
    );
  }

  // Format data for display: reduce the number of points for better readability
  // For longer time ranges, we'll sample fewer points
  const sampleInterval = timeRange === "1d" ? 1 : timeRange === "3d" ? 3 : 6;
  const sampledData = volumeData.filter(
    (_, index) => index % sampleInterval === 0
  );

  // Prepare data for the chart
  const labels = sampledData.map((item) => {
    const date = new Date(item.timestamp);
    return `${date.getHours()}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  });

  const chartData = {
    labels,
    datasets: [
      {
        data: sampledData.map((item) => item.callPutRatio),
        color: (opacity = 1) => `rgba(78, 175, 255, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ["Call/Put Ratio"],
  };

  // Calculate min and max for better chart scaling
  const ratios = sampledData.map((item) => item.callPutRatio);
  const minRatio = Math.min(...ratios) * 0.9; // Add 10% padding
  const maxRatio = Math.max(...ratios) * 1.1; // Add 10% padding

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>
        {symbol} - Options C/P Ratio ({timeRange})
      </ThemedText>
      <LineChart
        data={chartData}
        width={Dimensions.get("window").width - 32}
        height={220}
        chartConfig={{
          backgroundColor: chartBackground,
          backgroundGradientFrom: chartBackgroundGradientFrom,
          backgroundGradientTo: chartBackgroundGradientTo,
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: "#ffa726",
          },
          propsForLabels: {
            fontSize: 10,
          },
        }}
        bezier
        style={styles.chart}
        // Don't show all labels to avoid overcrowding
        withDots={sampledData.length < 20}
        withInnerLines={true}
        fromZero={false}
      />

      <ThemedView style={styles.volumeContainer}>
        <ThemedView style={styles.volumeCard}>
          <ThemedText style={styles.volumeLabel}>Call Volume</ThemedText>
          <ThemedText style={styles.volumeValue}>
            {sampledData[sampledData.length - 1]?.callVolume.toLocaleString() ||
              "0"}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.volumeCard}>
          <ThemedText style={styles.volumeLabel}>Put Volume</ThemedText>
          <ThemedText style={styles.volumeValue}>
            {sampledData[sampledData.length - 1]?.putVolume.toLocaleString() ||
              "0"}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.volumeCard}>
          <ThemedText style={styles.volumeLabel}>C/P Ratio</ThemedText>
          <ThemedText
            style={[
              styles.volumeValue,
              {
                color:
                  sampledData[sampledData.length - 1]?.callPutRatio > 1
                    ? "#4CAF50"
                    : "#F44336",
              },
            ]}
          >
            {sampledData[sampledData.length - 1]?.callPutRatio.toFixed(2) ||
              "0"}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedText style={styles.updateTime}>
        Last updated:{" "}
        {new Date(
          sampledData[sampledData.length - 1]?.timestamp || Date.now()
        ).toLocaleTimeString()}
      </ThemedText>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  loadingContainer: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
  },
  volumeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  volumeCard: {
    flex: 1,
    padding: 8,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  volumeLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  volumeValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  updateTime: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
});
