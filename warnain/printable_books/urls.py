from django.urls import path

from warnain.printable_books.views import CategoryListView, category_detail

app_name = "categories"

urlpatterns = [
    path("", CategoryListView.as_view(), name="list"),
    path("<pk>/", category_detail, name="detail"),
]

