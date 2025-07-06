import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  Switch,
  useTheme,
  Divider,
  List,
  ActivityIndicator,
  Text,
  Modal,
  Portal,
} from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { Settings } from "../types";
import settingsService from "../services/settings";
import apiService from "../services/api";
import { usePrintStatus } from "../hooks/usePrintStatus";
import {
  getNetworkInfo,
  autoDetectIP,
  setManualIP,
  clearSavedIP,
} from "../utils/network";

export default function SettingsScreen() {
  const theme = useTheme();
  const { printStatus, testPrinter, refreshStatus } = usePrintStatus();

  const [settings, setSettings] = useState<Settings>({
    baseUrl: "",
    defaultPrinter: "",
    autoConnect: true,
    printQuality: "normal",
    paperSize: "A4",
    colorMode: "color",
    duplex: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [newUrl, setNewUrl] = useState("");

  // Network state
  const [networkInfo, setNetworkInfo] = useState<{
    savedIP: string | null;
    detectedIP: string;
    baseURL: string;
    isConnected?: boolean;
  } | null>(null);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [manualIP, setManualIPState] = useState("");
  const [detectingIP, setDetectingIP] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const currentSettings = await settingsService.getSettings();
      setSettings(currentSettings);
      setNewUrl(currentSettings.baseUrl);
    } catch (error) {
      console.error("Error loading settings:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load settings",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNetworkInfo = useCallback(async () => {
    try {
      const info = await getNetworkInfo();
      const connectionStatus = await apiService.getNetworkInfo();
      setNetworkInfo({
        ...info,
        isConnected: connectionStatus.isConnected,
      });
    } catch (error) {
      console.error("Error loading network info:", error);
      // Set basic network info even if connection fails
      try {
        const basicInfo = await getNetworkInfo();
        setNetworkInfo({
          ...basicInfo,
          isConnected: false,
        });
      } catch (e) {
        console.error("Error loading basic network info:", e);
      }
    }
  }, []);

  const saveSettings = useCallback(async (newSettings: Partial<Settings>) => {
    try {
      setSaving(true);
      const updatedSettings = await settingsService.updateSettings(newSettings);
      setSettings(updatedSettings);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const handleUpdateUrl = async () => {
    if (!newUrl.trim()) {
      Alert.alert("Error", "Please enter a valid URL");
      return;
    }

    try {
      setSaving(true);
      await apiService.updateBaseUrl(newUrl);
      await saveSettings({ baseUrl: newUrl });
      setShowUrlModal(false);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Base URL updated successfully",
      });
    } catch (error) {
      console.error("Error updating URL:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update base URL",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrinter = async () => {
    try {
      setTesting(true);
      await testPrinter();
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Printer test completed",
      });
    } catch (error) {
      console.error("Error testing printer:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Printer test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset all settings to default values?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              const defaultSettings = await settingsService.resetSettings();
              setSettings(defaultSettings);
              setNewUrl(defaultSettings.baseUrl);
              Toast.show({
                type: "success",
                text1: "Success",
                text2: "Settings reset to default values",
              });
            } catch (error) {
              console.error("Error resetting settings:", error);
              Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to reset settings",
              });
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleAutoDetectIP = async () => {
    try {
      setDetectingIP(true);
      const detectedIP = await autoDetectIP();
      await apiService.autoDetectAndSetIP();
      await loadNetworkInfo();
      Toast.show({
        type: "success",
        text1: "Success",
        text2: `Auto-detected IP: ${detectedIP}`,
      });
    } catch (error) {
      console.error("Error auto-detecting IP:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to auto-detect IP",
      });
    } finally {
      setDetectingIP(false);
    }
  };

  const handleSetManualIP = async () => {
    if (!manualIP.trim()) {
      Alert.alert("Error", "Please enter a valid IP address");
      return;
    }

    try {
      setSaving(true);
      const success = await setManualIP(manualIP);
      if (success) {
        await apiService.autoDetectAndSetIP();
        await loadNetworkInfo();
        setShowNetworkModal(false);
        setManualIPState("");
        Toast.show({
          type: "success",
          text1: "Success",
          text2: `Manual IP set: ${manualIP}`,
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "IP address not reachable",
        });
      }
    } catch (error) {
      console.error("Error setting manual IP:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to set manual IP",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearSavedIP = async () => {
    try {
      await clearSavedIP();
      await loadNetworkInfo();
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Saved IP cleared. Will auto-detect on next request.",
      });
    } catch (error) {
      console.error("Error clearing saved IP:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to clear saved IP",
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSettings();
      loadNetworkInfo();
    }, [loadSettings, loadNetworkInfo])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
          Loading settings...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Connection Settings */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurface }}>
              Connection Settings
            </Title>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text
                  style={[
                    styles.settingLabel,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Base URL
                </Text>
                <Text
                  style={[
                    styles.settingValue,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {settings.baseUrl}
                </Text>
              </View>
              <Button
                mode="outlined"
                onPress={() => setShowUrlModal(true)}
                style={styles.settingButton}
              >
                Edit
              </Button>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text
                  style={[
                    styles.settingLabel,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Auto Connect
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Automatically connect to printer on startup
                </Text>
              </View>
              <Switch
                value={settings.autoConnect}
                onValueChange={(value) => saveSettings({ autoConnect: value })}
                disabled={saving}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Network Information */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurface }}>
              Network Information
            </Title>

            {networkInfo && (
              <>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text
                      style={[
                        styles.settingLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Connection Status
                    </Text>
                    <Text
                      style={[
                        styles.settingValue,
                        {
                          color: networkInfo.isConnected
                            ? theme.colors.primary
                            : theme.colors.error,
                        },
                      ]}
                    >
                      {networkInfo.isConnected ? "Connected" : "Disconnected"}
                    </Text>
                  </View>
                  <Button
                    mode="outlined"
                    onPress={loadNetworkInfo}
                    style={styles.settingButton}
                  >
                    Refresh
                  </Button>
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text
                      style={[
                        styles.settingLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Current IP
                    </Text>
                    <Text
                      style={[
                        styles.settingValue,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {networkInfo.detectedIP}
                    </Text>
                  </View>
                  <Button
                    mode="outlined"
                    onPress={handleAutoDetectIP}
                    loading={detectingIP}
                    disabled={detectingIP}
                    style={styles.settingButton}
                  >
                    Auto-detect
                  </Button>
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text
                      style={[
                        styles.settingLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Saved IP
                    </Text>
                    <Text
                      style={[
                        styles.settingValue,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {networkInfo.savedIP || "None"}
                    </Text>
                  </View>
                  <Button
                    mode="outlined"
                    onPress={() => setShowNetworkModal(true)}
                    style={styles.settingButton}
                  >
                    Manual
                  </Button>
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text
                      style={[
                        styles.settingLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Base URL
                    </Text>
                    <Text
                      style={[
                        styles.settingValue,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {networkInfo.baseURL}
                    </Text>
                  </View>
                  <Button
                    mode="outlined"
                    onPress={handleClearSavedIP}
                    style={styles.settingButton}
                  >
                    Clear
                  </Button>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Printer Settings */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurface }}>
              Printer Settings
            </Title>

            <List.Section>
              <List.Item
                title="Print Quality"
                description={settings.printQuality}
                left={(props) => <List.Icon {...props} icon="quality-high" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  Alert.alert("Print Quality", "Select print quality", [
                    {
                      text: "Draft",
                      onPress: () => saveSettings({ printQuality: "draft" }),
                    },
                    {
                      text: "Normal",
                      onPress: () => saveSettings({ printQuality: "normal" }),
                    },
                    {
                      text: "High",
                      onPress: () => saveSettings({ printQuality: "high" }),
                    },
                  ]);
                }}
              />

              <List.Item
                title="Paper Size"
                description={settings.paperSize}
                left={(props) => <List.Icon {...props} icon="file-document" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  Alert.alert("Paper Size", "Select paper size", [
                    {
                      text: "A4",
                      onPress: () => saveSettings({ paperSize: "A4" }),
                    },
                    {
                      text: "A3",
                      onPress: () => saveSettings({ paperSize: "A3" }),
                    },
                    {
                      text: "Letter",
                      onPress: () => saveSettings({ paperSize: "Letter" }),
                    },
                  ]);
                }}
              />

              <List.Item
                title="Color Mode"
                description={settings.colorMode}
                left={(props) => <List.Icon {...props} icon="palette" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  Alert.alert("Color Mode", "Select color mode", [
                    {
                      text: "Color",
                      onPress: () => saveSettings({ colorMode: "color" }),
                    },
                    {
                      text: "Grayscale",
                      onPress: () => saveSettings({ colorMode: "grayscale" }),
                    },
                  ]);
                }}
              />
            </List.Section>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text
                  style={[
                    styles.settingLabel,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Duplex Printing
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Print on both sides of paper
                </Text>
              </View>
              <Switch
                value={settings.duplex}
                onValueChange={(value) => saveSettings({ duplex: value })}
                disabled={saving}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Printer Status */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurface }}>
              Printer Status
            </Title>

            <View style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <Text
                  style={[
                    styles.statusLabel,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Status: {printStatus.status}
                </Text>
                <Text
                  style={[
                    styles.statusMessage,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {printStatus.message}
                </Text>
                {printStatus.printerName && (
                  <Text
                    style={[
                      styles.statusPrinter,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Printer: {printStatus.printerName}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={refreshStatus}
                style={styles.statusButton}
                disabled={saving}
              >
                Refresh
              </Button>
              <Button
                mode="contained"
                onPress={handleTestPrinter}
                loading={testing}
                disabled={testing || saving}
                style={styles.statusButton}
              >
                Test Printer
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Actions */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurface }}>Actions</Title>

            <Button
              mode="outlined"
              onPress={handleResetSettings}
              style={styles.actionButton}
              disabled={saving}
              textColor={theme.colors.error}
            >
              Reset Settings
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* URL Modal */}
      <Portal>
        <Modal
          visible={showUrlModal}
          onDismiss={() => setShowUrlModal(false)}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Title style={{ color: theme.colors.onSurface }}>
            Update Base URL
          </Title>
          <TextInput
            label="Base URL"
            value={newUrl}
            onChangeText={setNewUrl}
            placeholder="http://192.168.1.100:8000/api/v1"
            style={styles.urlInput}
            disabled={saving}
          />
          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setShowUrlModal(false)}
              style={styles.modalButton}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleUpdateUrl}
              loading={saving}
              disabled={saving}
              style={styles.modalButton}
            >
              Update
            </Button>
          </View>
        </Modal>

        {/* Network Modal */}
        <Modal
          visible={showNetworkModal}
          onDismiss={() => setShowNetworkModal(false)}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Title style={{ color: theme.colors.onSurface }}>
            Manual IP Configuration
          </Title>
          <Paragraph style={{ color: theme.colors.onSurfaceVariant }}>
            Enter the IP address of your Django backend server
          </Paragraph>
          <TextInput
            label="IP Address"
            value={manualIP}
            onChangeText={setManualIPState}
            placeholder="192.168.1.100"
            style={styles.urlInput}
            disabled={saving}
          />
          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => {
                setShowNetworkModal(false);
                setManualIPState("");
              }}
              style={styles.modalButton}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSetManualIP}
              loading={saving}
              disabled={saving}
              style={styles.modalButton}
            >
              Set IP
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingValue: {
    fontSize: 14,
    marginTop: 4,
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  settingButton: {
    marginLeft: 16,
  },
  statusRow: {
    marginTop: 16,
  },
  statusInfo: {
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  statusMessage: {
    fontSize: 14,
    marginTop: 4,
  },
  statusPrinter: {
    fontSize: 14,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  actionButton: {
    marginTop: 16,
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
  modalContainer: {
    margin: 20,
    borderRadius: 8,
    padding: 20,
  },
  urlInput: {
    marginTop: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    marginLeft: 8,
  },
});
