import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationService = {
  async requestPermissions(): Promise<boolean> {
    try {
      if (Device.isDevice) {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.log("Failed to get push token for push notification!");
          return false;
        }
      } else {
        console.log("Must use physical device for Push Notifications");
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      return true;
    } catch (error) {
      console.error("Error requesting notification permissions:", error);
      return false;
    }
  },

  async scheduleNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string | null> {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: trigger || null,
      });
      return id;
    } catch (error) {
      console.error("Error scheduling notification:", error);
      return null;
    }
  },

  async showNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<string | null> {
    return this.scheduleNotification(title, body, data);
  },

  async cancelNotification(id: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (error) {
      console.error("Error canceling notification:", error);
    }
  },

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Error canceling all notifications:", error);
    }
  },

  async getPushToken(): Promise<string | null> {
    try {
      if (Device.isDevice) {
        const token = await Notifications.getExpoPushTokenAsync();
        return token.data;
      } else {
        console.log("Must use physical device for Push Notifications");
        return null;
      }
    } catch (error) {
      console.error("Error getting push token:", error);
      return null;
    }
  },

  // Print-specific notifications
  async notifyPrintStarted(bookTitle: string, jobId: string): Promise<void> {
    await this.showNotification(
      "Print Started",
      `Started printing "${bookTitle}"`,
      { type: "print_started", jobId }
    );
  },

  async notifyPrintCompleted(bookTitle: string, jobId: string): Promise<void> {
    await this.showNotification(
      "Print Completed",
      `Successfully printed "${bookTitle}"`,
      { type: "print_completed", jobId }
    );
  },

  async notifyPrintFailed(
    bookTitle: string,
    jobId: string,
    error: string
  ): Promise<void> {
    await this.showNotification(
      "Print Failed",
      `Failed to print "${bookTitle}": ${error}`,
      { type: "print_failed", jobId, error }
    );
  },

  async notifyPrinterOffline(printerName: string): Promise<void> {
    await this.showNotification(
      "Printer Offline",
      `Printer "${printerName}" is offline or not responding`,
      { type: "printer_offline", printerName }
    );
  },

  async notifyPrinterConnected(printerName: string): Promise<void> {
    await this.showNotification(
      "Printer Connected",
      `Successfully connected to printer "${printerName}"`,
      { type: "printer_connected", printerName }
    );
  },

  async notifyLowPaper(printerName: string): Promise<void> {
    await this.showNotification(
      "Low Paper Warning",
      `Printer "${printerName}" is running low on paper`,
      { type: "low_paper", printerName }
    );
  },

  async notifyNewContent(count: number): Promise<void> {
    await this.showNotification(
      "New Content Available",
      `${count} new book${count > 1 ? "s" : ""} available for printing`,
      { type: "new_content", count }
    );
  },

  // Notification listeners
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(listener);
  },

  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  },

  removeNotificationSubscription(subscription: Notifications.Subscription) {
    Notifications.removeNotificationSubscription(subscription);
  },
};

export default notificationService;
