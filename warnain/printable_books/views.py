import cups
import os
from django.conf import settings
from django.db import models
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import ListAPIView, get_object_or_404, ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from warnain.printable_books.models import (
    Category,
    PrintableImage,
    CategoryAccess,
    PrinterSettings,
    NetworkInterface,
    PrintJob,
)
from warnain.printable_books.serializers import (
    CategorySerializer,
    PrintableImageSerializer,
    PrinterSettingsSerializer,
    NetworkInterfaceSerializer,
    PrintJobSerializer,
    TempPrintSerializer,
)
from warnain.printable_books.utils import (
    get_available_printers,
    check_printer_status,
    get_network_interfaces,
    get_interface_ip,
    get_default_printer,
    get_default_interface,
    save_temp_file,
    cleanup_temp_file,
    print_file,
    sync_system_printers,
    sync_network_interfaces,
)


@api_view(["GET"])
@permission_classes([])  # No authentication required for health check
def health_check(request):
    """
    Health check endpoint for mobile app IP detection
    """
    return Response(
        {
            "status": "ok",
            "message": "Django backend is running",
            "server_ip": request.META.get("HTTP_HOST", "unknown"),
            "timestamp": timezone.now().isoformat(),
        }
    )


class CategoryListView(ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    search_fields = ["title"]
    permission_classes = []  # No authentication required for development

    def get_queryset(self):
        qs = (
            super()
            .get_queryset()
            .annotate(
                access_count=models.Count("access"),
                latest_access=models.Subquery(
                    CategoryAccess.objects.filter(category_id=models.OuterRef("id"))
                    .order_by("-created")
                    .values("created")[:1]
                ),
            )
        )

        # Default sort by frequency (most accessed first)
        sort = self.request.GET.get("sort_by", "freq")

        if sort == "title":
            order_by = models.F("title").asc()
        elif sort == "freq":
            # Sort by access count descending, then by latest access, then by title
            order_by = [
                models.F("access_count").desc(nulls_last=True),
                models.F("latest_access").desc(nulls_last=True),
                models.F("title").asc(),
            ]
        elif sort == "access":
            order_by = models.F("latest_access").desc(nulls_last=True)
        else:
            order_by = models.F("title").asc()

        return qs.order_by(*order_by if isinstance(order_by, list) else [order_by])


@api_view(["GET"])
@permission_classes([])  # No authentication required for development
def last_category_access(request):
    histories = (
        CategoryAccess.objects.all()
        .prefetch_related("category")
        .order_by("-created")[:20]
    )
    categories = [h.category for h in histories]
    data = CategorySerializer(
        instance=categories, many=True, context={"request": request}
    ).data
    return Response(data)


@api_view(["GET"])
@permission_classes([])  # No authentication required for development
def category_detail(request, pk):
    category = get_object_or_404(Category, pk=pk)
    data = PrintableImageSerializer(
        instance=category.images.all(), many=True, context={"request": request}
    ).data

    # Always track access for frequency sorting (create anonymous access if no user)
    if request.user and request.user.is_authenticated:
        CategoryAccess.objects.create(user=request.user, category=category)
    else:
        # Create anonymous access tracking using a dummy user or IP-based tracking
        # For development, we'll use a simple approach
        from django.contrib.auth import get_user_model

        User = get_user_model()

        # Get or create anonymous user for tracking
        anonymous_user, _ = User.objects.get_or_create(
            username="anonymous",
            defaults={
                "email": "anonymous@example.com",
            },
        )
        CategoryAccess.objects.create(user=anonymous_user, category=category)

    return Response(data=data)


@api_view(["GET"])
@permission_classes([])  # No authentication required for development
def books_list(request):
    """
    Endpoint untuk mendapatkan daftar semua books/images
    """
    try:
        category_id = request.GET.get("category")
        search_query = request.GET.get("search")

        # Start with all images
        queryset = PrintableImage.objects.all()

        # Filter by category if provided
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        # Search if query provided
        if search_query:
            queryset = queryset.filter(
                models.Q(title__icontains=search_query)
                | models.Q(category__title__icontains=search_query)
            )

        # Paginate results
        from django.core.paginator import Paginator

        paginator = Paginator(queryset, 20)
        page_number = request.GET.get("page", 1)
        page_obj = paginator.get_page(page_number)

        # Serialize data
        data = PrintableImageSerializer(
            page_obj.object_list, many=True, context={"request": request}
        ).data

        return Response(
            {
                "count": paginator.count,
                "next": f"?page={page_obj.next_page_number()}"
                if page_obj.has_next()
                else None,
                "previous": f"?page={page_obj.previous_page_number()}"
                if page_obj.has_previous()
                else None,
                "results": data,
            }
        )

    except Exception as e:
        return Response(
            {"error": f"Error getting books: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([])  # No authentication required for development
def book_detail(request, pk):
    """
    Endpoint untuk mendapatkan detail book/image
    """
    try:
        book = get_object_or_404(PrintableImage, pk=pk)
        data = PrintableImageSerializer(book, context={"request": request}).data
        return Response(data)
    except Exception as e:
        return Response(
            {"error": f"Error getting book detail: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
def print_image(request: Request, pk):
    """Legacy endpoint untuk print image dari database"""
    image = get_object_or_404(PrintableImage, pk=pk)

    copies = request.data.get("copies", "1")
    printer_name = request.data.get("printer_name") or get_default_printer()

    if not printer_name:
        return Response(
            {"error": "Printer name tidak ditemukan"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Create print job record
    print_job = PrintJob.objects.create(
        user=request.user,
        printer_name=printer_name,
        file_path=image.image.path,
        copies=int(copies),
        status="pending",
    )

    try:
        success, message = print_file(printer_name, image.image.path, int(copies))

        if success:
            print_job.status = "completed"
            print_job.save()
            return Response(
                {"status": "ok", "message": message, "job_id": print_job.id}
            )
        else:
            print_job.status = "failed"
            print_job.error_message = message
            print_job.save()
            return Response(
                {"error": message, "job_id": print_job.id},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except Exception as e:
        print_job.status = "failed"
        print_job.error_message = str(e)
        print_job.save()
        return Response(
            {"error": str(e), "job_id": print_job.id},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def print_temp_image(request: Request):
    """
    Endpoint baru untuk print gambar dari upload temporary
    """
    serializer = TempPrintSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    image_file = serializer.validated_data["image"]
    copies = serializer.validated_data.get("copies", 1)
    printer_name = (
        serializer.validated_data.get("printer_name") or get_default_printer()
    )

    if not printer_name:
        return Response(
            {"error": "Printer name tidak ditemukan"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    temp_file_path = None
    try:
        # Save uploaded file to temporary directory
        temp_file_path = save_temp_file(image_file)

        # Create print job record
        print_job = PrintJob.objects.create(
            user=request.user,
            printer_name=printer_name,
            file_path=temp_file_path,
            copies=copies,
            status="pending",
        )

        # Print the file
        success, message = print_file(printer_name, temp_file_path, copies)

        if success:
            print_job.status = "completed"
            print_job.save()
            return Response(
                {
                    "status": "ok",
                    "message": message,
                    "job_id": print_job.id,
                    "file_name": image_file.name,
                }
            )
        else:
            print_job.status = "failed"
            print_job.error_message = message
            print_job.save()
            return Response(
                {"error": message, "job_id": print_job.id},
                status=status.HTTP_400_BAD_REQUEST,
            )

    except Exception as e:
        if "print_job" in locals():
            print_job.status = "failed"
            print_job.error_message = str(e)
            print_job.save()

        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    finally:
        # Always cleanup temporary file
        if temp_file_path:
            cleanup_temp_file(temp_file_path)


@api_view(["GET"])
@permission_classes([])  # No authentication required for development
def list_available_printers(request):
    """
    Endpoint untuk mendapatkan daftar printer yang tersedia di sistem
    """
    try:
        printers = get_available_printers()
        return Response({"printers": printers})
    except Exception as e:
        return Response(
            {"error": f"Error getting printers: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([])  # No authentication required for development
def check_printer_status_api(request, printer_name):
    """
    Endpoint untuk mengecek status printer
    """
    try:
        printer_status = check_printer_status(printer_name)
        return Response(printer_status)
    except Exception as e:
        return Response(
            {"error": f"Error checking printer status: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([])  # No authentication required for development
def list_network_interfaces(request):
    """
    Endpoint untuk mendapatkan daftar network interfaces
    """
    try:
        interfaces = get_network_interfaces()
        return Response({"interfaces": interfaces})
    except Exception as e:
        return Response(
            {"error": f"Error getting network interfaces: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([])  # No authentication required for development
def get_interface_ip_api(request, interface_name):
    """
    Endpoint untuk mendapatkan IP address dari interface tertentu
    """
    try:
        ip_address = get_interface_ip(interface_name)
        if ip_address:
            return Response({"interface": interface_name, "ip_address": ip_address})
        else:
            return Response(
                {
                    "error": f"IP address tidak ditemukan untuk interface {interface_name}"
                },
                status=status.HTTP_404_NOT_FOUND,
            )
    except Exception as e:
        return Response(
            {"error": f"Error getting IP address: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([])  # No authentication required for development
def get_current_ip(request):
    """
    Endpoint untuk mendapatkan IP otomatis dari default interface
    """
    try:
        default_interface = get_default_interface()
        if not default_interface:
            return Response(
                {"error": "Default interface tidak ditemukan"},
                status=status.HTTP_404_NOT_FOUND,
            )

        ip_address = get_interface_ip(default_interface)
        if ip_address:
            return Response({"interface": default_interface, "ip_address": ip_address})
        else:
            return Response(
                {
                    "error": f"IP address tidak ditemukan untuk interface {default_interface}"
                },
                status=status.HTTP_404_NOT_FOUND,
            )
    except Exception as e:
        return Response(
            {"error": f"Error getting current IP: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sync_printers(request):
    """
    Endpoint untuk sinkronisasi printer dari sistem ke database
    """
    try:
        success = sync_system_printers()
        if success:
            return Response({"message": "Printer berhasil disinkronisasi"})
        else:
            return Response(
                {"error": "Gagal sinkronisasi printer"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    except Exception as e:
        return Response(
            {"error": f"Error syncing printers: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sync_interfaces(request):
    """
    Endpoint untuk sinkronisasi network interface dari sistem ke database
    """
    try:
        success = sync_network_interfaces()
        if success:
            return Response({"message": "Network interface berhasil disinkronisasi"})
        else:
            return Response(
                {"error": "Gagal sinkronisasi network interface"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    except Exception as e:
        return Response(
            {"error": f"Error syncing interfaces: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ViewSets untuk CRUD operations
class PrinterSettingsViewSet(ModelViewSet):
    queryset = PrinterSettings.objects.all()
    serializer_class = PrinterSettingsSerializer
    permission_classes = []  # No authentication required for development


class NetworkInterfaceViewSet(ModelViewSet):
    queryset = NetworkInterface.objects.all()
    serializer_class = NetworkInterfaceSerializer
    permission_classes = []  # No authentication required for development


class PrintJobViewSet(ModelViewSet):
    serializer_class = PrintJobSerializer
    permission_classes = []  # No authentication required for development

    def get_queryset(self):
        # Return all print jobs for development (no user filtering)
        return PrintJob.objects.all()


@api_view(["POST"])
@permission_classes([])  # No authentication required for development
def track_category_access(request, pk):
    """
    Endpoint untuk tracking access dari mobile app
    """
    try:
        category = get_object_or_404(Category, pk=pk)

        # Track access (anonymous user for development)
        from django.contrib.auth import get_user_model

        User = get_user_model()

        # Get or create anonymous user for tracking
        anonymous_user, _ = User.objects.get_or_create(
            username="anonymous",
            defaults={
                "email": "anonymous@example.com",
            },
        )

        # Create access record
        CategoryAccess.objects.create(user=anonymous_user, category=category)

        # Get updated access count
        access_count = CategoryAccess.objects.filter(category=category).count()

        return Response(
            {
                "success": True,
                "message": "Access tracked successfully",
                "category_id": category.id,
                "access_count": access_count,
            }
        )

    except Exception as e:
        return Response(
            {"error": f"Error tracking access: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
