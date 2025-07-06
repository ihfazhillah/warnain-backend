import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
  StatusBar,
} from "react-native";
import {
  Card,
  Title,
  Paragraph,
  Button,
  ActivityIndicator,
  Text,
  useTheme,
  Modal,
  Portal,
  IconButton,
  FAB,
  Chip,
  Divider,
} from "react-native-paper";
import {
  useFocusEffect,
  useRoute,
  useNavigation,
} from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import PagerView from "react-native-pager-view";

import { PrintableBook, RootStackParamList } from "../types";
import apiService from "../services/api";
import settingsService from "../services/settings";

type RouteProps = RouteProp<RootStackParamList, "CategoryDetail">;

const { width, height } = Dimensions.get("window");

export default function CategoryDetailScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { categoryId } = route.params;

  const [books, setBooks] = useState<PrintableBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [printing, setPrinting] = useState<string | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<PrintableBook | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getBooks(categoryId);
      setBooks(response.results);
    } catch (error) {
      console.error("Error fetching books:", error);
      Alert.alert("Error", "Failed to fetch books");
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to fetch books",
      });
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBooks();
    setRefreshing(false);
  }, [fetchBooks]);

  const handlePrintPress = (book: PrintableBook) => {
    setSelectedBook(book);
    setShowPrintDialog(true);
  };

  const handlePrint = async () => {
    if (!selectedBook) return;

    try {
      setPrinting(selectedBook.id);
      setShowPrintDialog(false);

      const printerSettings = await settingsService.getPrinterSettings();

      const printData = {
        book: selectedBook.id,
        copies: 1,
        paper_size: printerSettings.paperSize,
        color_mode: printerSettings.colorMode,
        duplex: printerSettings.duplex,
      };

      await apiService.createPrintJob(printData);

      Toast.show({
        type: "success",
        text1: "Print Started! 🖨️",
        text2: `Started printing "${selectedBook.title}"`,
      });
    } catch (error) {
      console.error("Error printing book:", error);
      Alert.alert("Error", "Failed to start print job");
      Toast.show({
        type: "error",
        text1: "Print Failed",
        text2: "Failed to start print job",
      });
    } finally {
      setPrinting(null);
      setSelectedBook(null);
    }
  };

  const handleInfoPress = () => {
    if (books.length > 0) {
      setSelectedBook(books[currentPage]);
      setShowInfoModal(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBooks();
    }, [fetchBooks])
  );

  const renderPage = ({
    item,
    index,
  }: {
    item: PrintableBook;
    index: number;
  }) => (
    <View style={styles.pageContainer} key={`book-page-${item.id}-${index}`}>
      {/* Full Page Image */}
      <View style={styles.imageContainer}>
        {item.image ? (
          <Card.Cover
            source={{ uri: item.image }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        ) : (
          <View
            style={[
              styles.fullImage,
              styles.placeholderContainer,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Text
              style={[
                styles.placeholderText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              📚 No Image Available
            </Text>
          </View>
        )}

        {/* Page Indicator Overlay */}
        <View style={styles.pageIndicatorOverlay}>
          <View
            style={[
              styles.pageIndicatorBadge,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              style={[
                styles.pageIndicatorIcon,
                { color: theme.colors.onSurface },
              ]}
            >
              📄
            </Text>
            <Text
              style={[
                styles.pageIndicatorText,
                { color: theme.colors.onSurface },
              ]}
            >
              {index + 1}/{books.length}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const InfoModal = () => (
    <Portal>
      <Modal
        visible={showInfoModal}
        onDismiss={() => setShowInfoModal(false)}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.modalHeader}>
          <Title style={{ color: theme.colors.onSurface }}>
            📖 Book Information
          </Title>
          <IconButton
            icon="close"
            size={24}
            onPress={() => setShowInfoModal(false)}
          />
        </View>

        <Divider style={{ marginVertical: 16 }} />

        {selectedBook && (
          <View style={styles.modalContent}>
            <Text style={[styles.infoLabel, { color: theme.colors.onSurface }]}>
              Title:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
              {selectedBook.title}
            </Text>

            <Text style={[styles.infoLabel, { color: theme.colors.onSurface }]}>
              Description:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
              {selectedBook.description || "No description available"}
            </Text>

            <Text style={[styles.infoLabel, { color: theme.colors.onSurface }]}>
              Source:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
              {selectedBook.source}
            </Text>

            <Text style={[styles.infoLabel, { color: theme.colors.onSurface }]}>
              Category:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
              {selectedBook.category_name || "Unknown"}
            </Text>
          </View>
        )}

        <Button
          mode="contained"
          onPress={() => setShowInfoModal(false)}
          style={styles.closeButton}
        >
          Close
        </Button>
      </Modal>
    </Portal>
  );

  const PrintDialog = () => (
    <Portal>
      <Modal
        visible={showPrintDialog}
        onDismiss={() => setShowPrintDialog(false)}
        contentContainerStyle={[
          styles.printDialogContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.printDialogContent}>
          <Title style={[styles.printTitle, { color: theme.colors.onSurface }]}>
            🖨️ Print This Picture?
          </Title>

          {selectedBook && (
            <Text
              style={[styles.printSubtitle, { color: theme.colors.onSurface }]}
            >
              "{selectedBook.title}"
            </Text>
          )}

          <View style={styles.printDialogButtons}>
            <Button
              mode="outlined"
              onPress={() => setShowPrintDialog(false)}
              style={styles.printCancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handlePrint}
              loading={printing === selectedBook?.id}
              disabled={printing === selectedBook?.id}
              style={styles.printConfirmButton}
            >
              {printing === selectedBook?.id ? "Printing..." : "Print! 🖨️"}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
          Loading books...
        </Text>
      </View>
    );
  }

  if (books.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>
          📚 No books available in this category
        </Text>
        <Button mode="outlined" onPress={fetchBooks} style={styles.retryButton}>
          Try Again
        </Button>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar hidden />

      {/* Swipeable Image Gallery */}
      <PagerView
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        {books.map((book, index) => (
          <View key={`page-${book.id}`}>
            {renderPage({ item: book, index })}
          </View>
        ))}
      </PagerView>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        {/* Info Button */}
        <FAB
          icon="information"
          style={[
            styles.infoFab,
            { backgroundColor: theme.colors.secondaryContainer },
          ]}
          size="medium"
          onPress={handleInfoPress}
        />

        {/* Print Button */}
        <FAB
          icon="printer"
          style={[
            styles.printFab,
            { backgroundColor: theme.colors.primaryContainer },
          ]}
          size="large"
          onPress={() =>
            books[currentPage] && handlePrintPress(books[currentPage])
          }
          label="Print"
        />
      </View>

      {/* Swipe Instruction - Only show if more than 1 book */}
      {books.length > 1 && (
        <View style={styles.instructionTopContainer}>
          <Chip
            mode="outlined"
            icon="gesture-swipe-horizontal"
            style={[
              styles.instructionChip,
              { backgroundColor: theme.colors.surface },
            ]}
            textStyle={{ fontSize: 10 }}
          >
            Swipe for more
          </Chip>
        </View>
      )}

      <InfoModal />
      <PrintDialog />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchbar: {
    margin: 16,
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bookCard: {
    marginBottom: 16,
    elevation: 2,
  },
  bookContent: {
    flexDirection: "row",
  },
  bookImage: {
    width: 80,
    height: 120,
    marginRight: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  bookInfo: {
    flex: 1,
  },
  bookFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  sourceText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  printButton: {
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
  retryButton: {
    marginTop: 8,
  },
  modalContainer: {
    margin: 20,
    borderRadius: 8,
    padding: 20,
  },
  modalContent: {
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    marginBottom: 8,
  },
  closeButton: {
    marginTop: 20,
  },
  pagerView: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: width,
    height: height,
  },
  placeholderContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  pageIndicatorOverlay: {
    position: "absolute",
    bottom: 100, // Move up to avoid FAB overlap
    right: 16,
    zIndex: 1,
  },
  pageIndicatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  pageIndicatorIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  pageIndicatorText: {
    fontSize: 12,
    fontWeight: "600",
  },
  fabContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  infoFab: {
    marginRight: 8,
  },
  printFab: {
    marginLeft: 8,
  },
  instructionTopContainer: {
    position: "absolute",
    top: 60, // Position at top
    left: 20,
    right: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  instructionChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    opacity: 0.8,
  },

  printDialogContainer: {
    margin: 20,
    borderRadius: 8,
    padding: 20,
  },
  printDialogContent: {
    alignItems: "center",
  },
  printTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  printSubtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  printDialogButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  printCancelButton: {
    marginRight: 8,
  },
  printConfirmButton: {
    marginLeft: 8,
  },
});
