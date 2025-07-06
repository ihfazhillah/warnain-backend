import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert, Dimensions } from "react-native";
import {
  Text,
  Button,
  useTheme,
  ActivityIndicator,
  Card,
  Title,
  Paragraph,
} from "react-native-paper";
import { BarCodeScanner } from "expo-barcode-scanner";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";

import { RootStackParamList } from "../types";
import apiService from "../services/api";
import settingsService from "../services/settings";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get("window");

export default function QRScannerScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = async ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    setScanned(true);
    setProcessing(true);

    try {
      // Parse QR code data
      let bookId: string;

      if (data.startsWith("http")) {
        // Handle URL format: https://example.com/book/123
        const url = new URL(data);
        const pathParts = url.pathname.split("/");
        bookId = pathParts[pathParts.length - 1];
      } else {
        // Handle direct book ID
        bookId = data;
      }

      // Fetch book details
      const book = await apiService.getBook(bookId);

      // Show confirmation dialog
      Alert.alert(
        "Book Found",
        `Title: ${book.title}\nCategory: ${book.category_name}\n\nDo you want to print this book?`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setScanned(false);
              setProcessing(false);
            },
          },
          {
            text: "Print",
            onPress: async () => {
              try {
                const printerSettings =
                  await settingsService.getPrinterSettings();

                const printData = {
                  book: book.id,
                  copies: 1,
                  paper_size: printerSettings.paperSize,
                  color_mode: printerSettings.colorMode,
                  duplex: printerSettings.duplex,
                };

                await apiService.createPrintJob(printData);

                Toast.show({
                  type: "success",
                  text1: "Print Started",
                  text2: `Started printing "${book.title}"`,
                });

                setScanned(false);
                setProcessing(false);
              } catch (error) {
                console.error("Error printing book:", error);
                Alert.alert("Error", "Failed to start print job");
                setScanned(false);
                setProcessing(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error processing QR code:", error);
      Alert.alert(
        "Error",
        "Failed to process QR code. Please make sure it contains a valid book ID.",
        [
          {
            text: "OK",
            onPress: () => {
              setScanned(false);
              setProcessing(false);
            },
          },
        ]
      );
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setProcessing(false);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Card
          style={[
            styles.permissionCard,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Card.Content>
            <Title style={{ color: theme.colors.onSurface }}>
              Camera Permission Required
            </Title>
            <Paragraph style={{ color: theme.colors.onSurface }}>
              Please grant camera permission to scan QR codes.
            </Paragraph>
            <Button
              mode="contained"
              onPress={() => {
                BarCodeScanner.requestPermissionsAsync().then(({ status }) => {
                  setHasPermission(status === "granted");
                });
              }}
              style={styles.permissionButton}
            >
              Grant Permission
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.overlay}>
        <View style={styles.scannerFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <View style={styles.instructionContainer}>
          <Text
            style={[styles.instructionText, { color: theme.colors.onSurface }]}
          >
            Point your camera at a QR code to scan
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          {processing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text
                style={[
                  styles.processingText,
                  { color: theme.colors.onSurface },
                ]}
              >
                Processing...
              </Text>
            </View>
          ) : (
            scanned && (
              <Button
                mode="contained"
                onPress={resetScanner}
                style={styles.scanButton}
              >
                Scan Again
              </Button>
            )
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionCard: {
    padding: 20,
    elevation: 4,
  },
  permissionButton: {
    marginTop: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  scannerFrame: {
    position: "absolute",
    top: height * 0.3,
    left: width * 0.1,
    width: width * 0.8,
    height: width * 0.8,
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#fff",
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionContainer: {
    position: "absolute",
    top: height * 0.2,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  instructionText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    color: "#fff",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scanButton: {
    paddingHorizontal: 32,
  },
  processingContainer: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
  },
  processingText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});
