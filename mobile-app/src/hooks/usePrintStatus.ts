import { useState, useEffect, useCallback } from "react";
import { PrintStatus } from "../types";
import apiService from "../services/api";

export const usePrintStatus = () => {
  const [printStatus, setPrintStatus] = useState<PrintStatus>({
    isConnected: false,
    printerName: "",
    status: "offline",
    message: "Not connected",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrintStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const status = await apiService.getPrintStatus();
      setPrintStatus(status);
    } catch (error) {
      console.error("Error fetching print status:", error);
      setError("Failed to fetch print status");
      setPrintStatus({
        isConnected: false,
        printerName: "",
        status: "offline",
        message: "Connection failed",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const testPrinter = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiService.testPrinter();
      await fetchPrintStatus(); // Refresh status after test
      return result;
    } catch (error) {
      console.error("Error testing printer:", error);
      setError("Failed to test printer");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchPrintStatus]);

  const refreshStatus = useCallback(() => {
    fetchPrintStatus();
  }, [fetchPrintStatus]);

  useEffect(() => {
    fetchPrintStatus();
  }, [fetchPrintStatus]);

  // Auto-refresh every 30 seconds when connected
  useEffect(() => {
    if (printStatus.isConnected) {
      const interval = setInterval(fetchPrintStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [printStatus.isConnected, fetchPrintStatus]);

  return {
    printStatus,
    isLoading,
    error,
    testPrinter,
    refreshStatus,
  };
};
