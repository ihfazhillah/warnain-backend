import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import {
  Card,
  Title,
  Paragraph,
  Button,
  ActivityIndicator,
  Text,
  useTheme,
  Chip,
  IconButton,
} from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

import { PrintJob } from "../types";
import apiService from "../services/api";
import { usePrintStatus } from "../hooks/usePrintStatus";

export default function PrintHistoryScreen() {
  const theme = useTheme();
  const { printStatus, refreshStatus } = usePrintStatus();

  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPrintHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getPrintHistory();
      setPrintJobs(response.results);
    } catch (error) {
      console.error("Error fetching print history:", error);
      Alert.alert("Error", "Failed to fetch print history");
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to fetch print history",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPrintHistory(), refreshStatus()]);
    setRefreshing(false);
  }, [fetchPrintHistory, refreshStatus]);

  const handleRetryPrint = async (job: PrintJob) => {
    try {
      const printData = {
        book: job.book,
        copies: job.copies,
        pages: job.pages,
        paper_size: job.paper_size,
        color_mode: job.color_mode,
        duplex: job.duplex,
      };

      await apiService.createPrintJob(printData);

      Toast.show({
        type: "success",
        text1: "Print Started",
        text2: `Started printing "${job.book_title}"`,
      });

      await fetchPrintHistory();
    } catch (error) {
      console.error("Error retrying print:", error);
      Alert.alert("Error", "Failed to retry print job");
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    Alert.alert(
      "Delete Print Job",
      "Are you sure you want to delete this print job?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiService.deletePrintJob(jobId);
              Toast.show({
                type: "success",
                text1: "Success",
                text2: "Print job deleted",
              });
              await fetchPrintHistory();
            } catch (error) {
              console.error("Error deleting print job:", error);
              Alert.alert("Error", "Failed to delete print job");
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      fetchPrintHistory();
    }, [fetchPrintHistory])
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return theme.colors.tertiary;
      case "printing":
        return theme.colors.primary;
      case "pending":
        return theme.colors.secondary;
      case "failed":
        return theme.colors.error;
      default:
        return theme.colors.outline;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "checkmark-circle";
      case "printing":
        return "print";
      case "pending":
        return "time";
      case "failed":
        return "alert-circle";
      default:
        return "help-circle";
    }
  };

  const renderPrintJob = ({ item }: { item: PrintJob }) => (
    <Card style={[styles.jobCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.jobHeader}>
          <View style={styles.jobInfo}>
            <Title style={{ color: theme.colors.onSurface }} numberOfLines={2}>
              {item.book_title}
            </Title>
            <View style={styles.statusContainer}>
              <Chip
                mode="outlined"
                style={[
                  styles.statusChip,
                  { borderColor: getStatusColor(item.status) },
                ]}
                textStyle={{ color: getStatusColor(item.status) }}
                icon={() => (
                  <Ionicons
                    name={getStatusIcon(item.status)}
                    size={16}
                    color={getStatusColor(item.status)}
                  />
                )}
              >
                {item.status.toUpperCase()}
              </Chip>
            </View>
          </View>
          <IconButton
            icon="delete"
            size={20}
            onPress={() => handleDeleteJob(item.id)}
            iconColor={theme.colors.error}
          />
        </View>

        <View style={styles.jobDetails}>
          <Text style={[styles.detailText, { color: theme.colors.onSurface }]}>
            Printer: {item.printer_name}
          </Text>
          <Text style={[styles.detailText, { color: theme.colors.onSurface }]}>
            Copies: {item.copies}
          </Text>
          <Text style={[styles.detailText, { color: theme.colors.onSurface }]}>
            Paper: {item.paper_size}
          </Text>
          <Text style={[styles.detailText, { color: theme.colors.onSurface }]}>
            Color: {item.color_mode}
          </Text>
          <Text style={[styles.detailText, { color: theme.colors.onSurface }]}>
            Duplex: {item.duplex ? "Yes" : "No"}
          </Text>
        </View>

        <View style={styles.jobFooter}>
          <Text
            style={[styles.dateText, { color: theme.colors.onSurfaceVariant }]}
          >
            {new Date(item.created_at).toLocaleString()}
          </Text>
          {item.status === "failed" && (
            <Button
              mode="outlined"
              onPress={() => handleRetryPrint(item)}
              style={styles.retryButton}
            >
              Retry
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Card
        style={[styles.statusCard, { backgroundColor: theme.colors.surface }]}
      >
        <Card.Content>
          <View style={styles.statusContent}>
            <View style={styles.statusInfo}>
              <Title style={{ color: theme.colors.onSurface }}>
                Printer Status
              </Title>
              <View style={styles.statusRow}>
                <Chip
                  mode="outlined"
                  style={[
                    styles.statusChip,
                    {
                      borderColor: printStatus.isConnected
                        ? theme.colors.tertiary
                        : theme.colors.error,
                    },
                  ]}
                  textStyle={{
                    color: printStatus.isConnected
                      ? theme.colors.tertiary
                      : theme.colors.error,
                  }}
                  icon={() => (
                    <Ionicons
                      name={
                        printStatus.isConnected
                          ? "checkmark-circle"
                          : "alert-circle"
                      }
                      size={16}
                      color={
                        printStatus.isConnected
                          ? theme.colors.tertiary
                          : theme.colors.error
                      }
                    />
                  )}
                >
                  {printStatus.status.toUpperCase()}
                </Chip>
                <Text
                  style={[
                    styles.printerName,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {printStatus.printerName || "No printer"}
                </Text>
              </View>
            </View>
            <Button
              mode="outlined"
              onPress={refreshStatus}
              style={styles.refreshButton}
            >
              Refresh
            </Button>
          </View>
        </Card.Content>
      </Card>
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>
        No print history available.
      </Text>
      <Button
        mode="outlined"
        onPress={fetchPrintHistory}
        style={styles.retryButton}
      >
        Retry
      </Button>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
          Loading print history...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        ListHeaderComponent={renderHeader}
        data={printJobs}
        renderItem={renderPrintJob}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  headerContainer: {
    marginBottom: 16,
  },
  statusCard: {
    elevation: 2,
  },
  statusContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusInfo: {
    flex: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  statusChip: {
    marginRight: 12,
  },
  printerName: {
    fontSize: 14,
    fontWeight: "500",
  },
  refreshButton: {
    marginLeft: 16,
  },
  jobCard: {
    marginBottom: 16,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  jobInfo: {
    flex: 1,
  },
  statusContainer: {
    marginTop: 8,
  },
  jobDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  detailText: {
    fontSize: 14,
    marginBottom: 4,
  },
  jobFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  dateText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  retryButton: {
    marginLeft: 8,
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
});
