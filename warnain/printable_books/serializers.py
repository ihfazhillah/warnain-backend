from rest_framework import serializers

from warnain.printable_books.models import (
    Category,
    PrintableImage,
    PrinterSettings,
    NetworkInterface,
    PrintJob,
)


class CategorySerializer(serializers.ModelSerializer):
    access_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ("id", "title", "thumbnail", "source", "access_count")


class PrintableImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintableImage
        fields = ("id", "source", "image")


class PrinterSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrinterSettings
        fields = (
            "id",
            "name",
            "is_active",
            "is_default",
            "description",
            "created",
            "modified",
        )


class NetworkInterfaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NetworkInterface
        fields = (
            "id",
            "name",
            "ip_address",
            "is_active",
            "is_default",
            "description",
            "created",
            "modified",
        )


class PrintJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintJob
        fields = (
            "id",
            "printer_name",
            "file_path",
            "copies",
            "status",
            "error_message",
            "created",
            "modified",
        )
        read_only_fields = ("id", "created", "modified")


class TempPrintSerializer(serializers.Serializer):
    """Serializer untuk temporary print dari upload file"""

    image = serializers.ImageField(required=True)
    copies = serializers.IntegerField(default=1, min_value=1, max_value=10)
    printer_name = serializers.CharField(max_length=255, required=False)

    def validate_copies(self, value):
        if value < 1 or value > 10:
            raise serializers.ValidationError("Copies must be between 1 and 10")
        return value
