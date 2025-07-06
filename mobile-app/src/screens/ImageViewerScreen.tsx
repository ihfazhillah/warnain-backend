import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import { Text, useTheme, IconButton, Button } from "react-native-paper";
import { useRoute, useNavigation } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  runOnJS,
} from "react-native-reanimated";

import { RootStackParamList } from "../types";

type RouteProps = RouteProp<RootStackParamList, "ImageViewer">;

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function ImageViewerScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { imageUri, title } = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Animated values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Pinch gesture handler
  const pinchGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context) => {
      context.startScale = scale.value;
    },
    onActive: (event, context) => {
      scale.value = Math.max(
        0.5,
        Math.min(context.startScale * event.scale, 3)
      );
    },
    onEnd: () => {
      if (scale.value < 1) {
        scale.value = 1;
        translateX.value = 0;
        translateY.value = 0;
      }
    },
  });

  // Pan gesture handler
  const panGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX;
      translateY.value = context.startY + event.translationY;
    },
    onEnd: () => {
      // Reset position if image is not zoomed
      if (scale.value <= 1) {
        translateX.value = 0;
        translateY.value = 0;
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  const handleImageLoad = () => {
    setLoading(false);
  };

  const handleImageError = () => {
    setLoading(false);
    setError(true);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleReset = () => {
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  };

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={[styles.errorText, { color: theme.colors.error }]}>
        Failed to load image
      </Text>
      <Button mode="outlined" onPress={handleClose} style={styles.errorButton}>
        Close
      </Button>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
        Loading image...
      </Text>
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <IconButton
          icon="close"
          size={24}
          onPress={handleClose}
          iconColor={theme.colors.onSurface}
        />
        <Text
          style={[styles.headerTitle, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <IconButton
          icon="refresh"
          size={24}
          onPress={handleReset}
          iconColor={theme.colors.onSurface}
        />
      </View>

      {/* Image Content */}
      <View style={styles.imageContainer}>
        {error ? (
          renderError()
        ) : (
          <>
            {loading && renderLoading()}
            <PanGestureHandler onGestureEvent={panGestureHandler}>
              <Animated.View style={styles.gestureContainer}>
                <PinchGestureHandler onGestureEvent={pinchGestureHandler}>
                  <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.image}
                      resizeMode="contain"
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                    />
                  </Animated.View>
                </PinchGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          </>
        )}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
        <Text
          style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}
        >
          Pinch to zoom • Drag to pan
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 8,
    elevation: 2,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
    marginHorizontal: 16,
  },
  imageContainer: {
    flex: 1,
    position: "relative",
  },
  gestureContainer: {
    flex: 1,
  },
  imageWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 16,
  },
  errorButton: {
    marginTop: 16,
  },
  footer: {
    padding: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    fontStyle: "italic",
  },
});
