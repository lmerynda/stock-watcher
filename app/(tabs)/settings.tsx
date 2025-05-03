import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import SettingsService, {
  DataProvider,
  STORAGE_KEYS,
} from "@/services/SettingsService";
import { OptionsVolumeService } from "@/services/OptionsVolumeService";

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [useDummyData, setUseDummyData] = useState(false);
  const [isBackgroundEnabled, setIsBackgroundEnabled] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);

  const inputBackground = useThemeColor(
    { light: "#f1f1f1", dark: "#333333" },
    "background"
  );
  const buttonBackground = useThemeColor(
    { light: "#2196F3", dark: "#2196F3" },
    "background"
  );
  const infoColor = useThemeColor(
    { light: "#5B9BD5", dark: "#5B9BD5" },
    "text"
  );

  // Load the current settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const key = await SettingsService.get("TIINGO_API_KEY", "");
        if (key) {
          setApiKey(key);
        }

        // Load data provider setting
        const isUsingDummy =
          SettingsService.get("DATA_PROVIDER", DataProvider.DUMMY) ===
          DataProvider.DUMMY;
        setUseDummyData(isUsingDummy);

        // Load options volume settings
        const backgroundEnabled =
          await OptionsVolumeService.isBackgroundEnabled();
        setIsBackgroundEnabled(backgroundEnabled);

        const notificationsEnabled =
          await OptionsVolumeService.areNotificationsEnabled();
        setIsNotificationsEnabled(notificationsEnabled);
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert(
        "Invalid API Key",
        "Please enter a valid Tiingo API key to continue."
      );
      return;
    }

    setIsSaving(true);
    try {
      await SettingsService.set("TIINGO_API_KEY", apiKey.trim());
      Alert.alert(
        "Success",
        "Your Tiingo API key has been saved. The app will now use real market data."
      );
    } catch (error) {
      console.error("Error saving API key:", error);
      Alert.alert(
        "Error",
        "There was a problem saving your API key. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleDummyData = async (value: boolean) => {
    try {
      // Update UI immediately for responsiveness
      setUseDummyData(value);

      // Save the setting
      const provider = value ? DataProvider.DUMMY : DataProvider.TIINGO;
      await SettingsService.set("DATA_PROVIDER", provider);

      Alert.alert(
        "Data Provider Changed",
        value
          ? "Using dummy data with fixed values. No API calls will be made."
          : "Using Tiingo API for live stock data."
      );
    } catch (error) {
      console.error("Error saving data provider setting:", error);
      // Revert UI state if save failed
      setUseDummyData(!value);
      Alert.alert(
        "Error",
        "There was a problem saving your data provider setting."
      );
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.header}>
            <ThemedText style={styles.title}>Settings</ThemedText>
          </ThemedView>

          <ThemedView style={styles.content}>
            {/* Data Provider Settings */}
            <ThemedText style={styles.sectionTitle}>Data Provider</ThemedText>
            <ThemedView style={styles.settingRow}>
              <ThemedText style={styles.settingLabel}>
                Use Dummy Data
              </ThemedText>
              {isLoading ? (
                <ActivityIndicator size="small" color="#2196F3" />
              ) : (
                <Switch
                  value={useDummyData}
                  onValueChange={handleToggleDummyData}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={useDummyData ? "#2196F3" : "#f4f3f4"}
                />
              )}
            </ThemedView>
            <ThemedText style={styles.settingDescription}>
              {useDummyData
                ? "Using dummy data with AAPL, MSFT, and GOOGL stocks. No API calls will be made."
                : "Using Tiingo API for live stock data. API key required."}
            </ThemedText>

            {/* Options Volume Settings */}
            <ThemedText style={[styles.sectionTitle, { marginTop: 24 }]}>
              Options Volume Settings
            </ThemedText>
            <ThemedView style={styles.settingRow}>
              <ThemedText style={styles.settingLabel}>
                Background Updates
              </ThemedText>
              {isLoading ? (
                <ActivityIndicator size="small" color="#2196F3" />
              ) : (
                <Switch
                  value={isBackgroundEnabled}
                  onValueChange={handleToggleBackground}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={isBackgroundEnabled ? "#2196F3" : "#f4f3f4"}
                />
              )}
            </ThemedView>
            <ThemedText style={styles.settingDescription}>
              {isBackgroundEnabled
                ? "Options volume data will be updated every 10 minutes in the background."
                : "Background updates are disabled. Options data will only update when manually refreshed."}
            </ThemedText>

            <ThemedView style={styles.settingRow}>
              <ThemedText style={styles.settingLabel}>Notifications</ThemedText>
              {isLoading ? (
                <ActivityIndicator size="small" color="#2196F3" />
              ) : (
                <Switch
                  value={isNotificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={isNotificationsEnabled ? "#2196F3" : "#f4f3f4"}
                />
              )}
            </ThemedView>
            <ThemedText style={styles.settingDescription}>
              {isNotificationsEnabled
                ? "You will receive alerts when unusual options activity is detected."
                : "Notifications for unusual options activity are disabled."}
            </ThemedText>

            {/* API Key Settings */}
            <ThemedText style={[styles.sectionTitle, { marginTop: 24 }]}>
              Tiingo API
            </ThemedText>
            <ThemedText style={styles.description}>
              Stock Watcher uses Tiingo to fetch real-time market data. Enter
              your Tiingo API key below to enable live market data.
            </ThemedText>

            <ThemedText style={styles.label}>API Key</ThemedText>
            {isLoading ? (
              <ActivityIndicator size="small" color="#2196F3" />
            ) : (
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground },
                  useDummyData && styles.disabledInput,
                ]}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Enter your Tiingo API key"
                placeholderTextColor="#888888"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={false}
                editable={!useDummyData}
              />
            )}

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: buttonBackground },
                useDummyData && styles.disabledButton,
              ]}
              onPress={handleSaveApiKey}
              disabled={isSaving || useDummyData}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Save API Key</ThemedText>
              )}
            </TouchableOpacity>

            <ThemedText style={[styles.infoText, { color: infoColor }]}>
              Don't have a Tiingo API key? Visit{" "}
              <ThemedText
                style={[styles.link, { color: infoColor }]}
                onPress={() =>
                  Alert.alert(
                    "Get Tiingo API Key",
                    "Please visit tiingo.com and sign up for an account to get your API key."
                  )
                }
              >
                tiingo.com
              </ThemedText>{" "}
              to sign up for a free account.
            </ThemedText>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  button: {
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
  infoText: {
    fontSize: 14,
    marginTop: 24,
    textAlign: "center",
  },
  link: {
    textDecorationLine: "underline",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingDescription: {
    fontSize: 14,
    marginBottom: 16,
    color: "#777",
  },
  disabledInput: {
    opacity: 0.5,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
