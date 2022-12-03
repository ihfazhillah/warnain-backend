import cups
from django.conf import settings
from django.db import models
from rest_framework.decorators import api_view
from rest_framework.generics import ListAPIView, get_object_or_404
from rest_framework.request import Request
from rest_framework.response import Response

from warnain.printable_books.models import Category, PrintableImage, CategoryAccess
from warnain.printable_books.serializers import CategorySerializer, PrintableImageSerializer


class CategoryListView(ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    search_fields = ["title"]

    def get_queryset(self):
        qs = super().get_queryset().annotate(
            access_count=models.Count("access"),
            latest_access=models.Subquery(
                CategoryAccess.objects.filter(
                    category_id=models.OuterRef("id")
                ).order_by("-created").values("created")[:1]
            )
        )

        sort = self.request.GET.get("sort_by", "title")
        order_by = "-id"

        if sort == "title":
            order_by = "title"
        elif sort == "freq":
            order_by = "-access_count"
        elif sort == "access":
            order_by = "-latest_access"

        return qs.order_by(order_by)


@api_view(["GET"])
def last_category_access(request):
    histories = CategoryAccess.objects.all().prefetch_related("category").order_by("-created")[:20]
    categories = [h.category for h in histories]
    data = CategorySerializer(
        instance=categories,
        many=True,
        context={"request": request}
    ).data
    return Response(data)


@api_view(["GET"])
def category_detail(request, pk):
    category = get_object_or_404(Category, pk=pk)
    data = PrintableImageSerializer(instance=category.images.all(), many=True, context={"request": request}).data

    # logging
    CategoryAccess.objects.create(user=request.user, category=category)

    return Response(data=data)


@api_view(["POST"])
def print_image(request: Request, pk):
    image = get_object_or_404(PrintableImage, pk=pk)

    copies = request.data.get("copies", "1")

    connection = cups.Connection()
    connection.printFile(
        settings.PRINTER_NAME,
        image.image.path,
        f"printing {image.image.path}",
        {"copies": str(copies)}
    )
    return Response({"status": "ok"})
