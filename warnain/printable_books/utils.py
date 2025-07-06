import os
import subprocess
import tempfile
import cups
from typing import List, Dict, Optional, Tuple
from django.conf import settings

from warnain.printable_books.models import PrinterSettings, NetworkInterface


def get_available_printers() -> List[Dict[str, str]]:
    """
    Mendapatkan daftar printer yang tersedia di sistem CUPS
    """
    try:
        connection = cups.Connection()
        printers = connection.getPrinters()

        printer_list = []
        for printer_name, printer_info in printers.items():
            printer_list.append(
                {
                    "name": printer_name,
                    "description": printer_info.get("printer-info", ""),
                    "location": printer_info.get("printer-location", ""),
                    "state": printer_info.get("printer-state", ""),
                    "state_message": printer_info.get("printer-state-message", ""),
                    "is_accepting_jobs": printer_info.get(
                        "printer-is-accepting-jobs", False
                    ),
                }
            )

        return printer_list
    except Exception as e:
        print(f"Error getting printers: {e}")
        return []


def check_printer_status(printer_name: str) -> Dict[str, any]:
    """
    Mengecek status printer apakah aktif dan siap menerima job
    """
    try:
        connection = cups.Connection()
        printers = connection.getPrinters()

        if printer_name not in printers:
            return {
                "exists": False,
                "active": False,
                "message": f"Printer {printer_name} tidak ditemukan",
            }

        printer_info = printers[printer_name]
        is_active = printer_info.get("printer-is-accepting-jobs", False)
        state = printer_info.get("printer-state", "")
        state_message = printer_info.get("printer-state-message", "")

        return {
            "exists": True,
            "active": is_active,
            "state": state,
            "message": state_message,
            "location": printer_info.get("printer-location", ""),
            "description": printer_info.get("printer-info", ""),
        }
    except Exception as e:
        return {
            "exists": False,
            "active": False,
            "message": f"Error checking printer status: {str(e)}",
        }


def get_network_interfaces() -> List[Dict[str, str]]:
    """
    Mendapatkan daftar network interface yang tersedia
    """
    try:
        # Gunakan ip command untuk mendapatkan interfaces
        result = subprocess.run(["ip", "addr", "show"], capture_output=True, text=True)
        interfaces = []

        if result.returncode == 0:
            current_interface = None
            for line in result.stdout.split("\n"):
                line = line.strip()

                # Parse interface name
                if line and not line.startswith(" "):
                    parts = line.split(":")
                    if len(parts) >= 2:
                        interface_name = parts[1].strip()
                        # Skip loopback
                        if interface_name != "lo":
                            current_interface = {
                                "name": interface_name,
                                "ip_address": None,
                                "status": "DOWN",
                            }

                            # Check if UP
                            if "UP" in line:
                                current_interface["status"] = "UP"

                # Parse IP address
                elif line.startswith("inet ") and current_interface:
                    ip_part = line.split()[1]
                    ip_address = ip_part.split("/")[0]
                    current_interface["ip_address"] = ip_address

                    if current_interface not in interfaces:
                        interfaces.append(current_interface)

        return interfaces
    except Exception as e:
        print(f"Error getting network interfaces: {e}")
        return []


def get_interface_ip(interface_name: str) -> Optional[str]:
    """
    Mendapatkan IP address dari interface tertentu
    """
    try:
        command = f"ip addr show {interface_name} | grep 'inet ' | head -1 | awk '{{print $2}}' | cut -d/ -f1"
        result = subprocess.run(command, shell=True, capture_output=True, text=True)

        if result.returncode == 0:
            ip = result.stdout.strip()
            return ip if ip else None

        return None
    except Exception as e:
        print(f"Error getting IP for interface {interface_name}: {e}")
        return None


def get_default_printer() -> Optional[str]:
    """
    Mendapatkan default printer dari database atau settings
    """
    try:
        # Cari dari database
        default_printer = PrinterSettings.objects.filter(
            is_default=True, is_active=True
        ).first()
        if default_printer:
            return default_printer.name

        # Fallback ke settings
        return getattr(settings, "PRINTER_NAME", None)
    except Exception:
        return getattr(settings, "PRINTER_NAME", None)


def get_default_interface() -> Optional[str]:
    """
    Mendapatkan default interface dari database atau settings
    """
    try:
        # Cari dari database
        default_interface = NetworkInterface.objects.filter(
            is_default=True, is_active=True
        ).first()
        if default_interface:
            return default_interface.name

        # Fallback ke settings
        return getattr(settings, "INTERFACE", None)
    except Exception:
        return getattr(settings, "INTERFACE", None)


def save_temp_file(uploaded_file) -> str:
    """
    Menyimpan file yang diupload ke temporary directory
    """
    # Buat temporary file
    suffix = os.path.splitext(uploaded_file.name)[1]
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir="/tmp")

    # Tulis file content
    for chunk in uploaded_file.chunks():
        temp_file.write(chunk)

    temp_file.close()
    return temp_file.name


def cleanup_temp_file(file_path: str) -> bool:
    """
    Menghapus temporary file
    """
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception as e:
        print(f"Error cleaning up temp file {file_path}: {e}")
        return False


def print_file(
    printer_name: str, file_path: str, copies: int = 1, job_title: str = None
) -> Tuple[bool, str]:
    """
    Mencetak file ke printer yang ditentukan
    """
    try:
        # Check printer status first
        printer_status = check_printer_status(printer_name)
        if not printer_status["exists"]:
            return False, f"Printer {printer_name} tidak ditemukan"

        if not printer_status["active"]:
            return (
                False,
                f"Printer {printer_name} tidak aktif: {printer_status['message']}",
            )

        # Check if file exists
        if not os.path.exists(file_path):
            return False, f"File {file_path} tidak ditemukan"

        # Print file
        connection = cups.Connection()
        job_title = job_title or f"Print job - {os.path.basename(file_path)}"

        job_id = connection.printFile(
            printer_name, file_path, job_title, {"copies": str(copies)}
        )

        return True, f"Print job {job_id} berhasil dikirim ke printer {printer_name}"

    except Exception as e:
        return False, f"Error printing file: {str(e)}"


def sync_system_printers():
    """
    Sinkronisasi printer dari sistem ke database
    """
    try:
        system_printers = get_available_printers()

        for printer in system_printers:
            printer_name = printer["name"]
            description = printer.get("description", "")

            # Update atau buat printer setting
            printer_setting, created = PrinterSettings.objects.get_or_create(
                name=printer_name,
                defaults={"description": description, "is_active": True},
            )

            # Update description jika sudah ada
            if not created and printer_setting.description != description:
                printer_setting.description = description
                printer_setting.save()

        return True
    except Exception as e:
        print(f"Error syncing system printers: {e}")
        return False


def sync_network_interfaces():
    """
    Sinkronisasi network interface dari sistem ke database
    """
    try:
        system_interfaces = get_network_interfaces()

        for interface in system_interfaces:
            interface_name = interface["name"]
            ip_address = interface.get("ip_address")

            # Update atau buat network interface
            network_interface, created = NetworkInterface.objects.get_or_create(
                name=interface_name,
                defaults={
                    "ip_address": ip_address,
                    "is_active": interface["status"] == "UP",
                },
            )

            # Update IP address jika berubah
            if not created:
                network_interface.ip_address = ip_address
                network_interface.is_active = interface["status"] == "UP"
                network_interface.save()

        return True
    except Exception as e:
        print(f"Error syncing network interfaces: {e}")
        return False
