from django.contrib.auth import get_user_model
from django.db import models
from model_utils.models import TimeStampedModel


class Category(models.Model):
    title = models.CharField(max_length=255)
    thumbnail = models.ImageField(upload_to="categories/")

    class Meta:
        ordering = ("title",)

    def __str__(self):
        return self.title


class PrintableImage(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="printables/")
    source = models.URLField(max_length=500)


class CategoryAccess(TimeStampedModel):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="access")
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name="access")
