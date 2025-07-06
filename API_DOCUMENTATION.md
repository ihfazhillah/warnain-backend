# Warnain Printing API Documentation

## Overview
Warnain adalah aplikasi Django untuk mencetak gambar menggunakan CUPS (Common Unix Printing System) dengan fitur-fitur:
- Print gambar dari database (legacy)
- Print gambar dari upload temporary
- Manajemen printer dynamically
- Manajemen network interface
- Auto-detection IP address
- Print job tracking

## Base URL
```
Development: http://127.0.0.1:8000/api/categories/
Production: https://warnain.ihfazh.com/api/categories/
```

## Authentication
Semua endpoint memerlukan authentication kecuali yang ditandai sebagai **Public**.

Headers yang diperlukan:
```
Authorization: Token <your-token>
Content-Type: application/json
```

## API Endpoints

### 1. Category Management (Existing)

#### GET /api/categories/
**Public** - Mendapatkan daftar kategori gambar

**Query Parameters:**
- `sort_by`: `title` | `freq` | `access` (default: `title`)
- `search`: string untuk pencarian judul

**Response:**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Animals",
      "thumbnail": "http://example.com/media/categories/animals.jpg",
      "source": "https://example.com"
    }
  ]
}
```

#### GET /api/categories/{id}/
**Public** - Mendapatkan detail kategori dengan gambar

**Response:**
```json
[
  {
    "id": 1,
    "source": "https://example.com/image1.jpg",
    "image": "http://example.com/media/printables/image1.jpg"
  }
]
```

### 2. Print Endpoints

#### POST /api/categories/print-image/{id}/
**Legacy** - Print gambar dari database

**Request Body:**
```json
{
  "copies": 2,
  "printer_name": "HP-Printer" // optional, akan gunakan default
}
```

**Response:**
```json
{
  "status": "ok",
  "message": "Print job 123 berhasil dikirim ke printer HP-Printer",
  "job_id": 45
}
```

#### POST /api/categories/print-temp/
**NEW** - Print gambar dari upload temporary

**Request Body (multipart/form-data):**
```
image: <file>
copies: 2
printer_name: "HP-Printer" // optional
```

**Response:**
```json
{
  "status": "ok",
  "message": "Print job 124 berhasil dikirim ke printer HP-Printer",
  "job_id": 46,
  "file_name": "myimage.jpg"
}
```

### 3. Printer Management

#### GET /api/categories/printers/
**Public** - Mendapatkan daftar printer dari sistem CUPS

**Response:**
```json
{
  "printers": [
    {
      "name": "HP-Printer",
      "description": "HP LaserJet Pro",
      "location": "Office",
      "state": "3",
      "state_message": "Idle",
      "is_accepting_jobs": true
    }
  ]
}
```

#### GET /api/categories/printers/status/{printer_name}/
**Public** - Mengecek status printer

**Response:**
```json
{
  "exists": true,
  "active": true,
  "state": "3",
  "message": "Idle",
  "location": "Office",
  "description": "HP LaserJet Pro"
}
```

#### POST /api/categories/printers/sync/
**Auth Required** - Sinkronisasi printer dari sistem ke database

**Response:**
```json
{
  "message": "Printer berhasil disinkronisasi"
}
```

### 4. Network Interface Management

#### GET /api/categories/interfaces/
**Public** - Mendapatkan daftar network interfaces

**Response:**
```json
{
  "interfaces": [
    {
      "name": "eth0",
      "ip_address": "192.168.1.100",
      "status": "UP"
    }
  ]
}
```

#### GET /api/categories/interfaces/{interface_name}/ip/
**Public** - Mendapatkan IP address dari interface

**Response:**
```json
{
  "interface": "eth0",
  "ip_address": "192.168.1.100"
}
```

#### GET /api/categories/current-ip/
**Public** - Mendapatkan IP dari default interface

**Response:**
```json
{
  "interface": "eth0",
  "ip_address": "192.168.1.100"
}
```

#### POST /api/categories/interfaces/sync/
**Auth Required** - Sinkronisasi network interface ke database

**Response:**
```json
{
  "message": "Network interface berhasil disinkronisasi"
}
```

### 5. Settings Management (CRUD)

#### GET /api/categories/printer-settings/
**Auth Required** - Mendapatkan pengaturan printer

**Response:**
```json
[
  {
    "id": 1,
    "name": "HP-Printer",
    "is_active": true,
    "is_default": true,
    "description": "Default printer",
    "created": "2023-01-01T10:00:00Z",
    "modified": "2023-01-01T10:00:00Z"
  }
]
```

#### POST /api/categories/printer-settings/
**Auth Required** - Membuat pengaturan printer baru

**Request Body:**
```json
{
  "name": "New-Printer",
  "is_active": true,
  "is_default": false,
  "description": "New printer description"
}
```

#### PUT /api/categories/printer-settings/{id}/
**Auth Required** - Update pengaturan printer

#### DELETE /api/categories/printer-settings/{id}/
**Auth Required** - Hapus pengaturan printer

### 6. Network Interface Settings (CRUD)

#### GET /api/categories/network-interfaces/
**Auth Required** - Mendapatkan pengaturan network interface

#### POST /api/categories/network-interfaces/
**Auth Required** - Membuat pengaturan network interface baru

**Request Body:**
```json
{
  "name": "eth1",
  "ip_address": "192.168.1.101",
  "is_active": true,
  "is_default": false,
  "description": "Secondary interface"
}
```

### 7. Print Job Tracking

#### GET /api/categories/print-jobs/
**Auth Required** - Mendapatkan riwayat print jobs user

**Response:**
```json
[
  {
    "id": 1,
    "printer_name": "HP-Printer",
    "file_path": "/tmp/temp_image.jpg",
    "copies": 2,
    "status": "completed",
    "error_message": "",
    "created": "2023-01-01T10:00:00Z",
    "modified": "2023-01-01T10:00:00Z"
  }
]
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Printer name tidak ditemukan"
}
```

### 404 Not Found
```json
{
  "error": "Printer HP-Printer tidak ditemukan"
}
```

### 500 Internal Server Error
```json
{
  "error": "Error printing file: Connection failed"
}
```

## Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

## Print Job Status
- `pending`: Job sedang menunggu
- `printing`: Job sedang dicetak
- `completed`: Job selesai berhasil
- `failed`: Job gagal
- `cancelled`: Job dibatalkan

## Management Commands

### Initialize Settings
```bash
python manage.py init_printer_settings
python manage.py init_printer_settings --sync-only
python manage.py init_printer_settings --force
```

### Migration
```bash
python manage.py makemigrations printable_books
python manage.py migrate
```

## Usage Examples

### Upload and Print Image
```bash
curl -X POST \
  http://127.0.0.1:8000/api/categories/print-temp/ \
  -H "Authorization: Token your-token-here" \
  -F "image=@/path/to/image.jpg" \
  -F "copies=2" \
  -F "printer_name=HP-Printer"
```

### Check Printer Status
```bash
curl -X GET \
  http://127.0.0.1:8000/api/categories/printers/status/HP-Printer/
```

### Get Current IP
```bash
curl -X GET \
  http://127.0.0.1:8000/api/categories/current-ip/
```

## Features

### ✅ Implemented
- [x] Upload gambar temporary dan print
- [x] Manajemen printer settings dari API
- [x] List printer yang tersedia
- [x] Check status printer sebelum print
- [x] Manajemen network interface
- [x] Auto-detection IP address
- [x] Print job tracking
- [x] CRUD operations untuk settings
- [x] Sinkronisasi sistem ke database
- [x] Fallback ke settings lama

### 🔧 Configuration
- File temporary disimpan di `/tmp/` dan otomatis dihapus
- Default printer dan interface dari database dengan fallback ke settings
- Print job tracking untuk monitoring
- Admin interface untuk semua model

### 🛠️ Dependencies
- `pycups==2.0.1` - CUPS Python binding
- `django-rest-framework` - API framework
- `Pillow` - Image processing 