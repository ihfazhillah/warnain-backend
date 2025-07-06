import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

import CategoryListScreen from "../screens/CategoryListScreen";
import CategoryDetailScreen from "../screens/CategoryDetailScreen";
import QRScannerScreen from "../screens/QRScannerScreen";
import PrintHistoryScreen from "../screens/PrintHistoryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ImageViewerScreen from "../screens/ImageViewerScreen";

import { RootStackParamList, TabParamList } from "../types";

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function CategoryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CategoryList"
        component={CategoryListScreen}
        options={{ title: "Categories" }}
      />
      <Stack.Screen
        name="CategoryDetail"
        component={CategoryDetailScreen}
        options={{ title: "Books" }}
      />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Categories") {
            iconName = focused ? "library" : "library-outline";
          } else if (route.name === "Scanner") {
            iconName = focused ? "qr-code" : "qr-code-outline";
          } else if (route.name === "History") {
            iconName = focused ? "time" : "time-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          } else {
            iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
      })}
    >
      <Tab.Screen
        name="Categories"
        component={CategoryStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Scanner"
        component={QRScannerScreen}
        options={{ title: "QR Scanner" }}
      />
      <Tab.Screen
        name="History"
        component={PrintHistoryScreen}
        options={{ title: "Print History" }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ImageViewer"
        component={ImageViewerScreen}
        options={{
          presentation: "modal",
          title: "Image Viewer",
        }}
      />
    </Stack.Navigator>
  );
}
