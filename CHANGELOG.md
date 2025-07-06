# Changelog

All notable changes to the Warnain Print Management System will be documented in this file.

## [2.0.0] - 2025-01-06

### Added
- **Full-page image gallery** in CategoryDetailScreen with swipeable navigation
- **Page indicators** as overlay badges on images (📄 1/5 format)
- **Floating Action Buttons (FAB)** for Print and Info functions
- **Print confirmation dialog** with kid-friendly messaging
- **Information modal** with detailed book metadata (hidden by default)
- **Visits counter overlay** with eye icon on category thumbnails
- **Swipe instruction** guidance for multi-book categories
- **react-native-pager-view** dependency for smooth page transitions

### Changed
- **CategoryDetailScreen**: Transformed from list view to full-page swipeable gallery
- **User Interface**: Redesigned for child-friendly interaction with minimal text
- **Navigation**: Gesture-based swipe navigation instead of tap-based
- **Visits display**: Changed from chip to overlay badge with eye icon (👁️ + number)
- **Layout positioning**: Optimized to prevent UI element overlaps

### Enhanced
- **Image display**: Full-screen viewing with contain resize mode
- **Status bar**: Hidden for immersive experience
- **Button sizing**: Large FAB buttons for easy child interaction
- **Typography**: Reduced text size and improved readability
- **Visual hierarchy**: Clean separation of UI elements

### Fixed
- **UI overlapping**: Resolved conflicts between instruction text and action buttons
- **Page indicator positioning**: Moved to avoid FAB button overlap
- **Swipe instruction**: Repositioned to top of screen for better visibility
- **Layout responsiveness**: Proper spacing and positioning across different screen sizes

### Backend Enhancements
- **Django API**: Complete REST API for categories, books, and print jobs
- **CORS Configuration**: Cross-origin resource sharing for mobile app
- **CSRF Middleware**: Custom middleware for API access without tokens
- **Database Models**: New models for PrintJob, NetworkInterface, PrinterSettings
- **Admin Interface**: Enhanced Django admin for mobile app management
- **Utility Functions**: Network detection and printer configuration helpers
- **Management Commands**: Automated printer setup and initialization

### Technical
- **PagerView integration**: Smooth horizontal scrolling between book images
- **Overlay implementation**: Absolute positioning with z-index management
- **Shadow effects**: Cross-platform shadow implementation for depth
- **State management**: Proper page tracking and navigation state
- **Performance**: Optimized rendering for large image galleries
- **API Integration**: Complete Django REST framework implementation
- **Database Migrations**: New models for mobile app functionality 