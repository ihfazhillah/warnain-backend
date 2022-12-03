import json
import os
import random

from django.core.files.uploadedfile import UploadedFile
from django.core.management.base import BaseCommand

from warnain.printable_books.models import Category, PrintableImage


class Command(BaseCommand):
    help = 'Import from json - from scrapy'

    def add_arguments(self, parser):
        parser.add_argument('json_file')
        parser.add_argument('image_base_path')
        parser.add_argument('source')

    def handle(self, *args, **options):
        json_file = options.get("json_file")
        image_base_path = options.get("image_base_path")
        source = options.get("source", "https://warnain.ksatriamuslim.com")

        with open(json_file) as json_f:
            data_list = json.load(json_f)
            for cat in data_list:
                title = cat["category"].replace("Coloring Pages", "").strip()
                self.stdout.write(f"processing {title}")

                images_dict = {
                    item["url"]: item
                    for item in cat["images"]
                }

                thumbnail = random.choice(cat["image_urls"])

                with open(os.path.join(image_base_path, images_dict[thumbnail]["path"]), "rb") as thumbnail_f:
                    category = Category.objects.create(
                        title=title,
                        thumbnail=UploadedFile(thumbnail_f),
                        source=source,
                    )

                for key, image in images_dict.items():
                    with open(os.path.join(image_base_path, image["path"]), "rb") as image_f:
                        PrintableImage.objects.create(
                            category=category,
                            image=UploadedFile(image_f),
                            source=key
                        )


