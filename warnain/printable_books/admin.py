from django.contrib import admin

from warnain.printable_books.models import Category, PrintableImage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    pass


@admin.register(PrintableImage)
class PrintableImageAdmin(admin.ModelAdmin):
    pass

