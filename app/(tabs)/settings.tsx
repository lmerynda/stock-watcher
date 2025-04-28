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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { SettingsService } from "@/services/SettingsService";

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  // Load the current API key
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const key = await SettingsService.getTiingoApiKey();
        if (key) {
          setApiKey(key);
        }
      } catch (error) {
        console.error("Error loading API key:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadApiKey();
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
      await SettingsService.setTiingoApiKey(apiKey.trim());
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
            <ThemedText style={styles.sectionTitle}>Tiingo API</ThemedText>
            <ThemedText style={styles.description}>
              Stock Watcher uses Tiingo to fetch real-time market data. Enter
              your Tiingo API key below to enable live market data.
            </ThemedText>

            <ThemedText style={styles.label}>API Key</ThemedText>
            {isLoading ? (
              <ActivityIndicator size="small" color="#2196F3" />
            ) : (
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground }]}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Enter your Tiingo API key"
                placeholderTextColor="#888888"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={false}
              />
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: buttonBackground }]}
              onPress={handleSaveApiKey}
              disabled={isSaving}
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
});
