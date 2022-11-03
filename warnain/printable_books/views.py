from rest_framework.decorators import api_view
from rest_framework.generics import ListAPIView, get_object_or_404
from rest_framework.response import Response

from warnain.printable_books.models import Category
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
