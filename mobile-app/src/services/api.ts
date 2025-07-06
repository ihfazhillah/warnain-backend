import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Category,
  PrintableBook,
  PrintJob,
  PrinterSettings,
  NetworkInterface,
  ApiResponse,
} from "../types";
import { buildBaseURL, autoDetectIP, testConnection } from "../utils/network";

// Base URL configuration (will be updated dynamically)
let BASE_URL = "http://192.168.65.124:8000/api";

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Initialize with correct IP address
const initializeAPI = async () => {
  try {
    console.log("🔧 Initializing API with correct IP address...");
    const detectedBaseURL = await buildBaseURL();
    BASE_URL = detectedBaseURL;
    api.defaults.baseURL = detectedBaseURL;
    console.log(`✅ API initialized with: ${detectedBaseURL}`);
  } catch (error) {
    console.error("❌ Error initializing API:", error);
  }
};

// Initialize on import
initializeAPI();

// Request interceptor to add auth token if available (only for authenticated endpoints)
api.interceptors.request.use(
  async (config) => {
    // Skip authentication for public endpoints
    const publicEndpoints = ["/categories/health/", "/categories/", "/"];
    const isPublicEndpoint = publicEndpoints.some((endpoint) =>
      config.url?.includes(endpoint)
    );

    if (!isPublicEndpoint) {
      const token = await AsyncStorage.getItem("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Add CORS headers for development
    config.headers["Content-Type"] = "application/json";
    config.headers["Accept"] = "application/json";

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      AsyncStorage.removeItem("auth_token");
    }
    return Promise.reject(error);
  }
);

// API functions
export const apiService = {
  // Categories
  async getCategories(
    page: number = 1,
    sortBy: string = "freq"
  ): Promise<ApiResponse<Category>> {
    const response = await api.get(
      `/categories/?page=${page}&sort_by=${sortBy}`
    );
    return response.data;
  },

  async getCategory(id: string): Promise<Category> {
    const response = await api.get(`/categories/${id}/`);
    return response.data;
  },

  async trackCategoryAccess(categoryId: string): Promise<any> {
    const response = await api.post(`/categories/track/${categoryId}/`);
    return response.data;
  },

  async getLastAccess(): Promise<Category[]> {
    const response = await api.get("/categories/last-access/");
    return response.data;
  },

  // Books
  async getBooks(categoryId?: string): Promise<ApiResponse<PrintableBook>> {
    const url = categoryId
      ? `/categories/books/?category=${categoryId}`
      : "/categories/books/";
    const response = await api.get(url);
    return response.data;
  },

  async getBook(id: string): Promise<PrintableBook> {
    const response = await api.get(`/categories/books/${id}/`);
    return response.data;
  },

  async searchBooks(query: string): Promise<ApiResponse<PrintableBook>> {
    const response = await api.get(
      `/categories/books/?search=${encodeURIComponent(query)}`
    );
    return response.data;
  },

  // Print Jobs
  async createPrintJob(data: {
    book: string;
    copies?: number;
    pages?: string;
    paper_size?: string;
    color_mode?: "color" | "grayscale";
    duplex?: boolean;
  }): Promise<PrintJob> {
    const response = await api.post("/categories/print-jobs/", data);
    return response.data;
  },

  async getPrintJobs(): Promise<ApiResponse<PrintJob>> {
    const response = await api.get("/categories/print-jobs/");
    return response.data;
  },

  async getPrintJob(id: string): Promise<PrintJob> {
    const response = await api.get(`/categories/print-jobs/${id}/`);
    return response.data;
  },

  async updatePrintJob(id: string, data: Partial<PrintJob>): Promise<PrintJob> {
    const response = await api.patch(`/categories/print-jobs/${id}/`, data);
    return response.data;
  },

  async deletePrintJob(id: string): Promise<void> {
    await api.delete(`/categories/print-jobs/${id}/`);
  },

  // Printer Settings
  async getPrinterSettings(): Promise<ApiResponse<PrinterSettings>> {
    const response = await api.get("/categories/printer-settings/");
    return response.data;
  },

  async createPrinterSettings(
    data: Omit<PrinterSettings, "id" | "created_at" | "updated_at">
  ): Promise<PrinterSettings> {
    const response = await api.post("/categories/printer-settings/", data);
    return response.data;
  },

  async updatePrinterSettings(
    id: string,
    data: Partial<PrinterSettings>
  ): Promise<PrinterSettings> {
    const response = await api.patch(
      `/categories/printer-settings/${id}/`,
      data
    );
    return response.data;
  },

  async deletePrinterSettings(id: string): Promise<void> {
    await api.delete(`/categories/printer-settings/${id}/`);
  },

  // Network Interfaces
  async getNetworkInterfaces(): Promise<ApiResponse<NetworkInterface>> {
    const response = await api.get("/categories/network-interfaces/");
    return response.data;
  },

  async updateNetworkInterface(
    id: string,
    data: Partial<NetworkInterface>
  ): Promise<NetworkInterface> {
    const response = await api.patch(
      `/categories/network-interfaces/${id}/`,
      data
    );
    return response.data;
  },

  // Printer Management (System Level)
  async getAvailablePrinters(): Promise<any> {
    const response = await api.get("/categories/printers/");
    return response.data;
  },

  async getPrinterStatus(printerName: string): Promise<any> {
    const response = await api.get(
      `/categories/printers/status/${printerName}/`
    );
    return response.data;
  },

  async syncPrinters(): Promise<any> {
    const response = await api.post("/categories/printers/sync/");
    return response.data;
  },

  // Network Management (System Level)
  async getSystemInterfaces(): Promise<any> {
    const response = await api.get("/categories/interfaces/");
    return response.data;
  },

  async getInterfaceIP(interfaceName: string): Promise<any> {
    const response = await api.get(
      `/categories/interfaces/${interfaceName}/ip/`
    );
    return response.data;
  },

  async syncInterfaces(): Promise<any> {
    const response = await api.post("/categories/interfaces/sync/");
    return response.data;
  },

  async getCurrentIP(): Promise<any> {
    const response = await api.get("/categories/current-ip/");
    return response.data;
  },

  // Print History
  async getPrintHistory(): Promise<ApiResponse<PrintJob>> {
    const response = await api.get("/categories/print-jobs/?ordering=-created");
    return response.data;
  },

  // Settings
  async updateBaseUrl(url: string): Promise<void> {
    await AsyncStorage.setItem("base_url", url);
    api.defaults.baseURL = url;
    BASE_URL = url;
  },

  async getBaseUrl(): Promise<string> {
    return (await AsyncStorage.getItem("base_url")) || BASE_URL;
  },

  // Network management
  async reinitializeAPI(): Promise<string> {
    await initializeAPI();
    return api.defaults.baseURL;
  },

  async testConnection(): Promise<boolean> {
    try {
      const response = await api.get("/categories/health/");
      return response.status === 200;
    } catch (error) {
      console.log("Connection test failed:", error);
      return false;
    }
  },

  async autoDetectAndSetIP(): Promise<string> {
    try {
      const detectedIP = await autoDetectIP();
      const newBaseURL = `http://${detectedIP}:8000/api`;
      api.defaults.baseURL = newBaseURL;
      BASE_URL = newBaseURL;
      await AsyncStorage.setItem("base_url", newBaseURL);
      return detectedIP;
    } catch (error) {
      console.error("Error auto-detecting IP:", error);
      throw error;
    }
  },

  // Network info for debugging
  async getNetworkInfo(): Promise<{
    currentBaseURL: string;
    detectedIP: string;
    isConnected: boolean;
  }> {
    const detectedIP = await autoDetectIP();
    const isConnected = await testConnection(detectedIP);

    return {
      currentBaseURL: api.defaults.baseURL,
      detectedIP,
      isConnected,
    };
  },

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await api.get("/categories/health/");
      return response.status === 200;
    } catch (error) {
      return false;
    }
  },
};

export default apiService;
