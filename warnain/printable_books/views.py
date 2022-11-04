import cups
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.generics import ListAPIView, get_object_or_404
from rest_framework.request import Request
from rest_framework.response import Response

from warnain.printable_books.models import Category, PrintableImage
from warnain.printable_books.serializers import CategorySerializer, PrintableImageSerializer


class CategoryListView(ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    search_fields = ["title"]


@api_view(["GET"])
def category_detail(request, pk):
    category = get_object_or_404(Category, pk=pk)
    data = PrintableImageSerializer(instance=category.images.all(), many=True, context={"request": request}).data
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
