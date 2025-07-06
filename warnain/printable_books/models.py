from django.contrib.auth import get_user_model
from django.db import models
from model_utils.models import TimeStampedModel


class Category(models.Model):
    title = models.CharField(max_length=255)
    thumbnail = models.ImageField(upload_to="categories/")
    source = models.URLField(default="https://iheartcraftythings.com")

    class Meta:
        ordering = ("title",)

    def __str__(self):
        return self.title


class PrintableImage(models.Model):
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(upload_to="printables/")
    source = models.URLField(max_length=500)


class CategoryAccess(TimeStampedModel):
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="access"
    )
    user = models.ForeignKey(
        get_user_model(), on_delete=models.CASCADE, related_name="access"
    )


class PrinterSettings(TimeStampedModel):
    """Model untuk menyimpan pengaturan printer"""

    name = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Pastikan hanya ada satu default printer
        if self.is_default:
            PrinterSettings.objects.filter(is_default=True).exclude(pk=self.pk).update(
                is_default=False
            )
        super().save(*args, **kwargs)


class NetworkInterface(TimeStampedModel):
    """Model untuk menyimpan pengaturan network interface"""

    name = models.CharField(max_length=50, unique=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return f"{self.name} - {self.ip_address}"

    def save(self, *args, **kwargs):
        # Pastikan hanya ada satu default interface
        if self.is_default:
            NetworkInterface.objects.filter(is_default=True).exclude(pk=self.pk).update(
                is_default=False
            )
        super().save(*args, **kwargs)


class PrintJob(TimeStampedModel):
    """Model untuk tracking print jobs"""

    user = models.ForeignKey(
        get_user_model(), on_delete=models.CASCADE, related_name="print_jobs"
    )
    printer_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    copies = models.IntegerField(default=1)
    status = models.CharField(
        max_length=50,
        choices=[
            ("pending", "Pending"),
            ("printing", "Printing"),
            ("completed", "Completed"),
            ("failed", "Failed"),
            ("cancelled", "Cancelled"),
        ],
        default="pending",
    )
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ("-created",)

    def __str__(self):
        return f"Print Job {self.id} - {self.status}"
