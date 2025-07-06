import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
} from "react-native";
import {
  Card,
  Title,
  Paragraph,
  Button,
  Searchbar,
  ActivityIndicator,
  Text,
  useTheme,
  Menu,
  Divider,
  IconButton,
  Chip,
} from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";

import { Category, RootStackParamList } from "../types";
import apiService from "../services/api";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get("window");

// Responsive grid calculation
const getNumColumns = () => {
  if (width > 1200) return 4; // Large tablet/desktop
  if (width > 768) return 3; // Tablet landscape
  if (width > 600) return 2; // Tablet portrait
  return 1; // Mobile
};

const getItemWidth = (numColumns: number) => {
  const padding = 16;
  const cardMargin = 8;
  return (width - padding * 2 - cardMargin * (numColumns - 1)) / numColumns;
};

const SORT_OPTIONS = [
  { key: "freq", label: "Most Visited", icon: "trending-up" },
  { key: "access", label: "Recently Accessed", icon: "clock" },
  { key: "title", label: "Alphabetical", icon: "sort-alphabetical-ascending" },
];

export default function CategoryListScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [numColumns, setNumColumns] = useState(getNumColumns());
  const [sortBy, setSortBy] = useState("freq");
  const [menuVisible, setMenuVisible] = useState(false);

  // Listen to orientation changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      const newNumColumns = getNumColumns();
      if (newNumColumns !== numColumns) {
        setNumColumns(newNumColumns);
      }
    });

    return () => subscription?.remove();
  }, [numColumns]);

  const fetchCategories = useCallback(
    async (page: number = 1, reset: boolean = false) => {
      try {
        if (page === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const response = await apiService.getCategories(page, sortBy);

        if (reset || page === 1) {
          setCategories(response.results);
          setFilteredCategories(response.results);
        } else {
          // Prevent duplicate entries by filtering existing IDs
          setCategories((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const newItems = response.results.filter(
              (item) => !existingIds.has(item.id)
            );
            return [...prev, ...newItems];
          });
          setFilteredCategories((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const newItems = response.results.filter(
              (item) => !existingIds.has(item.id)
            );
            return [...prev, ...newItems];
          });
        }

        setHasMore(!!response.next);
        setCurrentPage(page);
      } catch (error) {
        console.error("Error fetching categories:", error);
        Alert.alert("Error", "Failed to fetch categories");
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to fetch categories",
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sortBy]
  );

  const loadMore = useCallback(async () => {
    if (!loadingMore && hasMore && !searchQuery) {
      await fetchCategories(currentPage + 1);
    }
  }, [loadingMore, hasMore, currentPage, searchQuery, fetchCategories]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCategories(1, true);
    setRefreshing(false);
  }, [fetchCategories]);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.trim() === "") {
        setFilteredCategories(categories);
      } else {
        const filtered = categories.filter(
          (category) =>
            category.title.toLowerCase().includes(query.toLowerCase()) ||
            category.source.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredCategories(filtered);
      }
    },
    [categories]
  );

  const handleSortChange = useCallback(
    (newSortBy: string) => {
      setSortBy(newSortBy);
      setMenuVisible(false);
      // Reset and fetch with new sort
      fetchCategories(1, true);
    },
    [fetchCategories]
  );

  const handleCategoryPress = async (category: Category) => {
    // Track access
    try {
      await apiService.trackCategoryAccess(category.id);
      console.log(`Tracked access for category: ${category.title}`);
    } catch (error) {
      console.error("Error tracking access:", error);
    }

    navigation.navigate("CategoryDetail", { categoryId: category.id });
  };

  useFocusEffect(
    useCallback(() => {
      fetchCategories(1, true);
    }, [fetchCategories])
  );

  const renderCategory = ({
    item,
    index,
  }: {
    item: Category;
    index: number;
  }) => {
    const itemWidth = getItemWidth(numColumns);

    return (
      <View
        style={[styles.gridItem, { width: itemWidth }]}
        key={`category-item-${item.id}-${index}`}
      >
        <Card
          style={[
            styles.categoryCard,
            { backgroundColor: theme.colors.surface },
          ]}
          onPress={() => handleCategoryPress(item)}
        >
          <View style={styles.imageContainer}>
            {item.thumbnail ? (
              <Card.Cover
                source={{ uri: item.thumbnail }}
                style={styles.cardImage}
              />
            ) : (
              <View
                style={[
                  styles.cardImage,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  No Image
                </Text>
              </View>
            )}

            {/* Visits overlay */}
            <View style={styles.visitsOverlay}>
              <View
                style={[
                  styles.visitsBadge,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Text
                  style={[styles.visitsIcon, { color: theme.colors.onSurface }]}
                >
                  👁️
                </Text>
                <Text
                  style={[styles.visitsText, { color: theme.colors.onSurface }]}
                >
                  {item.access_count || 0}
                </Text>
              </View>
            </View>
          </View>

          <Card.Content style={styles.cardContent}>
            <Title
              style={[styles.cardTitle, { color: theme.colors.onSurface }]}
              numberOfLines={2}
            >
              {item.title}
            </Title>

            <View style={styles.metaContainer}>
              <Text
                style={[
                  styles.sourceText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                numberOfLines={1}
              >
                Source: {item.source}
              </Text>
            </View>
          </Card.Content>

          <Card.Actions>
            <Button
              mode="contained"
              onPress={() => handleCategoryPress(item)}
              style={styles.viewButton}
              compact
            >
              View Books
            </Button>
          </Card.Actions>
        </Card>
      </View>
    );
  };

  const renderHeader = () => {
    const currentSort = SORT_OPTIONS.find((opt) => opt.key === sortBy);

    return (
      <View>
        <View style={styles.headerContainer}>
          <Searchbar
            placeholder="Search categories..."
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchbar}
          />

          {/* Sort Menu */}
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="sort"
                size={24}
                onPress={() => setMenuVisible(true)}
                style={styles.sortButton}
              />
            }
          >
            {SORT_OPTIONS.map((option, index) => (
              <Menu.Item
                key={`sort-option-${option.key}-${index}`}
                onPress={() => handleSortChange(option.key)}
                title={option.label}
                leadingIcon={option.icon}
                style={
                  sortBy === option.key
                    ? { backgroundColor: theme.colors.primaryContainer }
                    : {}
                }
              />
            ))}
          </Menu>
        </View>

        {/* Current sort indicator */}
        <View style={styles.sortIndicator}>
          <Chip
            mode="outlined"
            icon={currentSort?.icon}
            style={styles.sortChip}
          >
            Sorted by: {currentSort?.label}
          </Chip>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.footerText, { color: theme.colors.onSurface }]}>
          Loading more categories...
        </Text>
      </View>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>
        {searchQuery
          ? "No categories found matching your search."
          : "No categories available."}
      </Text>
      <Button
        mode="outlined"
        onPress={() => fetchCategories(1, true)}
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
          Loading categories...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        data={filteredCategories}
        renderItem={renderCategory}
        keyExtractor={(item) => `category-${item.id}`}
        numColumns={numColumns}
        key={`grid-${numColumns}-${sortBy}`} // Force re-render when columns or sort changes
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
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
  searchbar: {
    flex: 1,
    marginRight: 8,
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  categoryCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  sourceText: {
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 8,
  },
  viewButton: {
    marginHorizontal: 8,
    marginBottom: 8,
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
  cardImage: {
    height: 150,
    width: "100%",
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  gridItem: {
    padding: 4,
  },
  footerLoader: {
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  sortButton: {
    marginLeft: 8,
  },
  sortIndicator: {
    padding: 16,
    paddingTop: 8,
  },
  sortChip: {
    marginLeft: 8,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  imageContainer: {
    position: "relative",
  },
  visitsOverlay: {
    position: "absolute",
    bottom: 8,
    left: 8,
    zIndex: 1,
  },
  visitsBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  visitsIcon: {
    fontSize: 10,
    marginRight: 2,
  },
  visitsText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
