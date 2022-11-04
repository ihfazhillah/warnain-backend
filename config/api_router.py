from django.conf import settings
from django.urls import path, include
from rest_framework.routers import DefaultRouter, SimpleRouter

from warnain.users.api.views import UserViewSet, get_token

if settings.DEBUG:
    router = DefaultRouter()
else:
    router = SimpleRouter()

router.register("users", UserViewSet)


app_name = "api"
urlpatterns = router.urls + [
    path("categories/", include("warnain.printable_books.urls", namespace="categories")),
    path("get-token/", get_token, name="token")
]
