from django.core.management.base import BaseCommand
from django.conf import settings

from warnain.printable_books.models import PrinterSettings, NetworkInterface
from warnain.printable_books.utils import sync_system_printers, sync_network_interfaces


class Command(BaseCommand):
    help = "Initialize printer and network interface settings"

    def add_arguments(self, parser):
        parser.add_argument(
            "--sync-only",
            action="store_true",
            help="Only sync from system, do not create default settings",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force update existing settings",
        )

    def handle(self, *args, **options):
        sync_only = options.get("sync_only")
        force = options.get("force")

        self.stdout.write(
            self.style.SUCCESS("Initializing printer and network settings...")
        )

        # Sync system printers
        self.stdout.write("Syncing system printers...")
        if sync_system_printers():
            self.stdout.write(
                self.style.SUCCESS("✓ System printers synced successfully")
            )
        else:
            self.stdout.write(self.style.ERROR("✗ Failed to sync system printers"))

        # Sync network interfaces
        self.stdout.write("Syncing network interfaces...")
        if sync_network_interfaces():
            self.stdout.write(
                self.style.SUCCESS("✓ Network interfaces synced successfully")
            )
        else:
            self.stdout.write(self.style.ERROR("✗ Failed to sync network interfaces"))

        if not sync_only:
            # Create default printer from settings if not exists
            printer_name = getattr(settings, "PRINTER_NAME", None)
            if printer_name:
                printer, created = PrinterSettings.objects.get_or_create(
                    name=printer_name,
                    defaults={
                        "is_active": True,
                        "is_default": True,
                        "description": "Default printer from settings",
                    },
                )

                if created:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ Default printer "{printer_name}" created'
                        )
                    )
                elif force:
                    printer.is_default = True
                    printer.is_active = True
                    printer.save()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ Default printer "{printer_name}" updated'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'~ Printer "{printer_name}" already exists')
                    )

            # Create default network interface from settings if not exists
            interface_name = getattr(settings, "INTERFACE", None)
            if interface_name:
                interface, created = NetworkInterface.objects.get_or_create(
                    name=interface_name,
                    defaults={
                        "is_active": True,
                        "is_default": True,
                        "description": "Default interface from settings",
                    },
                )

                if created:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ Default interface "{interface_name}" created'
                        )
                    )
                elif force:
                    interface.is_default = True
                    interface.is_active = True
                    interface.save()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ Default interface "{interface_name}" updated'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'~ Interface "{interface_name}" already exists'
                        )
                    )

        self.stdout.write(self.style.SUCCESS("Initialization completed!"))

        # Print summary
        printer_count = PrinterSettings.objects.count()
        interface_count = NetworkInterface.objects.count()

        self.stdout.write(f"\nSummary:")
        self.stdout.write(f"  Printers: {printer_count}")
        self.stdout.write(f"  Network Interfaces: {interface_count}")

        default_printer = PrinterSettings.objects.filter(is_default=True).first()
        default_interface = NetworkInterface.objects.filter(is_default=True).first()

        if default_printer:
            self.stdout.write(f"  Default Printer: {default_printer.name}")
        if default_interface:
            self.stdout.write(f"  Default Interface: {default_interface.name}")
