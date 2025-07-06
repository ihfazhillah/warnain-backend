import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Network utility untuk deteksi IP address yang benar
 * untuk koneksi ke Django backend
 */

// Default IP addresses untuk testing (192.168.65.124 adalah IP yang benar)
const DEFAULT_IPS = [
  "192.168.65.124", // IP yang benar - PRIMARY
  "192.168.1.100", // Common home network
  "192.168.0.100", // Alternative home network
  "10.0.2.2", // Android emulator
  "10.0.0.2", // Alternative emulator
  "127.0.0.1", // Localhost
];

/**
 * Test koneksi ke Django backend
 */
export const testConnection = async (
  ip: string,
  port: number = 8000
): Promise<boolean> => {
  try {
    const response = await fetch(
      `http://${ip}:${port}/api/categories/health/`,
      {
        method: "GET",
        timeout: 5000,
      }
    );
    return response.ok;
  } catch (error) {
    console.log(`Connection failed for ${ip}:${port}`, error);
    return false;
  }
};

/**
 * Auto-detect IP address yang benar
 */
export const autoDetectIP = async (): Promise<string> => {
  console.log("🔍 Auto-detecting Django backend IP address...");

  // Cek IP yang tersimpan terlebih dahulu
  const savedIP = await AsyncStorage.getItem("backend_ip");
  if (savedIP) {
    console.log(`Testing saved IP: ${savedIP}`);
    const isWorking = await testConnection(savedIP);
    if (isWorking) {
      console.log(`✅ Saved IP working: ${savedIP}`);
      return savedIP;
    }
  }

  // Test semua IP yang mungkin
  for (const ip of DEFAULT_IPS) {
    console.log(`Testing IP: ${ip}`);
    const isWorking = await testConnection(ip);
    if (isWorking) {
      console.log(`✅ Found working IP: ${ip}`);
      await AsyncStorage.setItem("backend_ip", ip);
      return ip;
    }
  }

  // Fallback ke IP yang benar
  const fallbackIP = DEFAULT_IPS[0]; // 192.168.65.124
  console.log(`⚠️ No working IP found, using fallback: ${fallbackIP}`);
  return fallbackIP;
};

/**
 * Get current system IP (untuk referensi)
 */
export const getCurrentIP = async (): Promise<string> => {
  try {
    if (Platform.OS === "web") {
      // Untuk web, gunakan window.location.hostname
      return window.location.hostname;
    }

    // Untuk mobile, kita tidak bisa detect IP dengan mudah
    // Jadi kita return yang sudah dideteksi
    return await autoDetectIP();
  } catch (error) {
    console.log("Error getting current IP:", error);
    return DEFAULT_IPS[0];
  }
};

/**
 * Build base URL dengan IP yang benar
 */
export const buildBaseURL = async (port: number = 8000): Promise<string> => {
  const ip = await autoDetectIP();
  return `http://${ip}:${port}/api`;
};

/**
 * Manual set IP address
 */
export const setManualIP = async (ip: string): Promise<boolean> => {
  console.log(`Setting manual IP: ${ip}`);
  const isWorking = await testConnection(ip);
  if (isWorking) {
    await AsyncStorage.setItem("backend_ip", ip);
    console.log(`✅ Manual IP set successfully: ${ip}`);
    return true;
  } else {
    console.log(`❌ Manual IP not working: ${ip}`);
    return false;
  }
};

/**
 * Clear saved IP (force re-detection)
 */
export const clearSavedIP = async (): Promise<void> => {
  await AsyncStorage.removeItem("backend_ip");
  console.log("🗑️ Saved IP cleared, will auto-detect on next request");
};

/**
 * Get network info untuk debugging
 */
export const getNetworkInfo = async (): Promise<{
  savedIP: string | null;
  detectedIP: string;
  baseURL: string;
}> => {
  const savedIP = await AsyncStorage.getItem("backend_ip");
  const detectedIP = await autoDetectIP();
  const baseURL = await buildBaseURL();

  return {
    savedIP,
    detectedIP,
    baseURL,
  };
};

export default {
  testConnection,
  autoDetectIP,
  getCurrentIP,
  buildBaseURL,
  setManualIP,
  clearSavedIP,
  getNetworkInfo,
};
