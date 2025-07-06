import AsyncStorage from "@react-native-async-storage/async-storage";
import { Settings } from "../types";

const SETTINGS_KEY = "app_settings";

const defaultSettings: Settings = {
  baseUrl: "http://192.168.1.100:8000/api/v1",
  defaultPrinter: "",
  autoConnect: true,
  printQuality: "normal",
  paperSize: "A4",
  colorMode: "color",
  duplex: false,
};

export const settingsService = {
  async getSettings(): Promise<Settings> {
    try {
      const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        return { ...defaultSettings, ...settings };
      }
      return defaultSettings;
    } catch (error) {
      console.error("Error getting settings:", error);
      return defaultSettings;
    }
  },

  async updateSettings(newSettings: Partial<Settings>): Promise<Settings> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...newSettings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
      return updatedSettings;
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  },

  async resetSettings(): Promise<Settings> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
      return defaultSettings;
    } catch (error) {
      console.error("Error resetting settings:", error);
      throw error;
    }
  },

  async updateBaseUrl(url: string): Promise<void> {
    try {
      await this.updateSettings({ baseUrl: url });
    } catch (error) {
      console.error("Error updating base URL:", error);
      throw error;
    }
  },

  async getBaseUrl(): Promise<string> {
    try {
      const settings = await this.getSettings();
      return settings.baseUrl;
    } catch (error) {
      console.error("Error getting base URL:", error);
      return defaultSettings.baseUrl;
    }
  },

  async updatePrinterSettings(settings: {
    defaultPrinter?: string;
    printQuality?: "draft" | "normal" | "high";
    paperSize?: "A4" | "A3" | "Letter";
    colorMode?: "color" | "grayscale";
    duplex?: boolean;
  }): Promise<void> {
    try {
      await this.updateSettings(settings);
    } catch (error) {
      console.error("Error updating printer settings:", error);
      throw error;
    }
  },

  async getPrinterSettings(): Promise<{
    defaultPrinter: string;
    printQuality: "draft" | "normal" | "high";
    paperSize: "A4" | "A3" | "Letter";
    colorMode: "color" | "grayscale";
    duplex: boolean;
  }> {
    try {
      const settings = await this.getSettings();
      return {
        defaultPrinter: settings.defaultPrinter,
        printQuality: settings.printQuality,
        paperSize: settings.paperSize,
        colorMode: settings.colorMode,
        duplex: settings.duplex,
      };
    } catch (error) {
      console.error("Error getting printer settings:", error);
      return {
        defaultPrinter: defaultSettings.defaultPrinter,
        printQuality: defaultSettings.printQuality,
        paperSize: defaultSettings.paperSize,
        colorMode: defaultSettings.colorMode,
        duplex: defaultSettings.duplex,
      };
    }
  },
};

export default settingsService;
