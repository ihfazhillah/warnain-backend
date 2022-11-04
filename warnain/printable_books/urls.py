from django.urls import path

from warnain.printable_books.views import CategoryListView, category_detail, print_image, last_category_access

app_name = "categories"

urlpatterns = [
    path("", CategoryListView.as_view(), name="list"),
    path("last-access/", last_category_access, name="last-access"),
    path("<pk>/", category_detail, name="detail"),
    path("print-image/<pk>/", print_image, name="print"),
]

