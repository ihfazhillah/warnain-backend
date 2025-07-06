from django.urls import path, include
from rest_framework.routers import DefaultRouter

from warnain.printable_books.views import (
    CategoryListView,
    category_detail,
    print_image,
    last_category_access,
    print_temp_image,
    list_available_printers,
    check_printer_status_api,
    list_network_interfaces,
    get_interface_ip_api,
    get_current_ip,
    sync_printers,
    sync_interfaces,
    PrinterSettingsViewSet,
    NetworkInterfaceViewSet,
    PrintJobViewSet,
    health_check,
    books_list,
    book_detail,
    track_category_access,
)

# Router untuk ViewSets
router = DefaultRouter()
router.register(r"printer-settings", PrinterSettingsViewSet)
router.register(r"network-interfaces", NetworkInterfaceViewSet)
router.register(r"print-jobs", PrintJobViewSet, basename="printjob")

app_name = "categories"

urlpatterns = [
    # Health check endpoint
    path("health/", health_check, name="health-check"),
    # Books endpoints (new for mobile app) - MUST BE BEFORE <pk>/
    path("books/", books_list, name="books-list"),
    path("books/<pk>/", book_detail, name="book-detail"),
    # Print endpoints - MUST BE BEFORE <pk>/
    path("print-image/<pk>/", print_image, name="print"),  # Legacy: print from database
    path("print-temp/", print_temp_image, name="print-temp"),  # New: print from upload
    # Printer management endpoints - MUST BE BEFORE <pk>/
    path("printers/", list_available_printers, name="list-printers"),
    path(
        "printers/status/<str:printer_name>/",
        check_printer_status_api,
        name="printer-status",
    ),
    path("printers/sync/", sync_printers, name="sync-printers"),
    # Network interface endpoints - MUST BE BEFORE <pk>/
    path("interfaces/", list_network_interfaces, name="list-interfaces"),
    path(
        "interfaces/<str:interface_name>/ip/", get_interface_ip_api, name="interface-ip"
    ),
    path("interfaces/sync/", sync_interfaces, name="sync-interfaces"),
    # Current IP endpoint - MUST BE BEFORE <pk>/
    path("current-ip/", get_current_ip, name="current-ip"),
    # Last access endpoint - MUST BE BEFORE <pk>/
    path("last-access/", last_category_access, name="last-access"),
    # Track access endpoint - MUST BE BEFORE <pk>/
    path("track/<pk>/", track_category_access, name="track-access"),
    # Category endpoints (existing) - MUST BE BEFORE ViewSet
    path("", CategoryListView.as_view(), name="list"),
    path("<pk>/", category_detail, name="detail"),
    # ViewSet URLs (CRUD operations) - Use specific path prefix
    path("admin/", include(router.urls)),
]
