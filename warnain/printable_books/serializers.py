from rest_framework import serializers

from warnain.printable_books.models import Category, PrintableImage


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "title", "thumbnail")


class PrintableImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintableImage
        fields = ("id", "source", "image")
