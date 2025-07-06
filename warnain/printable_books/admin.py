from django.contrib import admin

from warnain.printable_books.models import (
    Category,
    PrintableImage,
    CategoryAccess,
    PrinterSettings,
    NetworkInterface,
    PrintJob,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("title", "source")
    search_fields = ("title",)
    list_filter = ("source",)


@admin.register(PrintableImage)
class PrintableImageAdmin(admin.ModelAdmin):
    list_display = ("category", "source")
    list_filter = ("category",)
    search_fields = ("category__title",)


@admin.register(CategoryAccess)
class CategoryAccessAdmin(admin.ModelAdmin):
    list_display = ("category", "user", "created")
    list_filter = ("created", "category")
    search_fields = ("category__title", "user__username")
    ordering = ("-created",)


@admin.register(PrinterSettings)
class PrinterSettingsAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "is_default", "created")
    list_filter = ("is_active", "is_default")
    search_fields = ("name", "description")
    ordering = ("name",)


@admin.register(NetworkInterface)
class NetworkInterfaceAdmin(admin.ModelAdmin):
    list_display = ("name", "ip_address", "is_active", "is_default", "created")
    list_filter = ("is_active", "is_default")
    search_fields = ("name", "ip_address")
    ordering = ("name",)


@admin.register(PrintJob)
class PrintJobAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "printer_name", "copies", "status", "created")
    list_filter = ("status", "printer_name", "created")
    search_fields = ("user__username", "printer_name", "file_path")
    ordering = ("-created",)
    readonly_fields = ("created", "modified")
