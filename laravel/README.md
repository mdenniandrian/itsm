# 🚀 ITSM Enterprise Service Desk & IT Operations Portal

<p align="center">
  <a href="https://github.com/mdenniandrian/itsm">
    <img src="https://img.shields.io/badge/Repository-mdenniandrian%2Fitsm-6366f1?style=for-the-badge&logo=github" alt="GitHub Repository">
  </a>
  <img src="https://img.shields.io/badge/Release-v1.0.0-10b981?style=for-the-badge&logo=rocket" alt="Version 1.0.0">
  <img src="https://img.shields.io/badge/Framework-Laravel%2011%20%2F%2012-ff2d20?style=for-the-badge&logo=laravel" alt="Laravel">
  <img src="https://img.shields.io/badge/PHP-8.2%2B-777bb4?style=for-the-badge&logo=php" alt="PHP 8.2+">
  <img src="https://img.shields.io/badge/Tests-42%20Passed-success?style=for-the-badge&logo=checkmarx" alt="Tests 42 Passed">
  <img src="https://img.shields.io/badge/Database-MySQL%20%7C%20PostgreSQL%20%7C%20SQLite-00758f?style=for-the-badge&logo=mysql" alt="Database">
  <a href="https://instagram.com/mdenniandrian_">
    <img src="https://img.shields.io/badge/Author-%40mdenniandrian__-e1306c?style=for-the-badge&logo=instagram" alt="Instagram">
  </a>
</p>

---

**ITSM Enterprise** adalah portal manajemen layanan TI (*IT Service Management*) modern berstandar **ITIL 4** yang dirancang untuk mengelola tiket insiden, permintaan layanan mandiri (*Service Catalog*), manajemen perubahan (*Change Management & CAB*), investigasi akar masalah (*Problem Management & RCA*), inventaris aset TI (*CMDB*), pemantauan telemetri perangkat (*RMM Endpoint Monitoring Agent*), log audit keamanan (*Enterprise Audit Logs*), serta *tools* diagnostik jaringan & server.

Portal ini dilengkapi dengan integrasi autentikasi **Zimbra LDAP SSO**, gateway **SMTP Email Notification non-blocking**, bot **Telegram Alert**, serta **Superadmin Brand & Theme Studio** dengan kustomisasi favicon browser, logo banner memanjang (*wide text logo*), pemilih palet warna kustom (*live color picker*), dan mode Terang/Gelap (*Light & Dark Mode*).

---

## 📑 Daftar Isi
1. [Fitur Utama Sistem](#-fitur-utama-sistem)
2. [Arsitektur & Struktur Direktori](#-arsitektur--struktur-direktori)
3. [Kebutuhan Sistem (System Requirements)](#-kebutuhan-sistem-system-requirements)
4. [Panduan Lengkap Deployment ke VPS Produksi (Langkah Berurutan)](#-panduan-lengkap-deployment-ke-vps-produksi)
   - [Langkah 1: Install Dependensi & Persiapan Server](#langkah-1-persiapan-server--install-dependensi)
   - [Langkah 2: Setup Database Server (MySQL / MariaDB)](#langkah-2-setup-database-server-mysql--mariadb)
   - [Langkah 3: Clone Repository & Konfigurasi .env](#langkah-3-clone-repository--konfigurasi-env)
   - [Langkah 4: Jalankan Auto-Installer (setup.sh)](#langkah-4-jalankan-auto-installer-setupsh)
   - [Langkah 5: Konfigurasi Web Server Nginx & SSL HTTPS](#langkah-5-konfigurasi-web-server-nginx--ssl-https)
   - [Langkah 6: Aktifkan Background Queue Worker (Systemd)](#langkah-6-aktifkan-background-queue-worker-systemd)
   - [Langkah 7: Akses Portal & Akun Super Administrator](#langkah-7-akses-portal--kredensial-super-administrator)
   - [Langkah 8: Hubungkan Endpoint Agent di Komputer Client](#langkah-8-hubungkan-endpoint-agent-di-komputer-client)
5. [Opsi Deployment Alternatif: Docker / Docker Compose (Home Server & Portainer)](#-opsi-deployment-alternatif-docker--docker-compose)
6. [Tabel Referensi Konfigurasi (.env)](#-tabel-referensi-konfigurasi-env)
7. [Pengujian Otomatis (Automated Testing)](#-pengujian-otomatis-automated-testing)
8. [Hak Cipta & Pengembang](#-hak-cipta--pengembang)

---

## 🌟 Fitur Utama Sistem

| Modul | Deskripsi & Kemampuan |
| :--- | :--- |
| 🎫 **Incident & Ticket Lifecycle** | Siklus hidup tiket lengkap (`Open`, `In Progress`, `Pending`, `Resolved`, `Closed`), SLA timer otomatis, eskalasi prioritas, penugasan teknisi, lampiran berkas hingga 50MB, dan riwayat aktivitas tiket. |
| 📋 **Katalog Layanan (Service Catalog)** | Portal pemesanan layanan TI mandiri bagi pengguna (permintaan hardware, akun akses, VPN, instalasi software) dengan SLA deadline terdefinisi otomatis. |
| 🔄 **Change Management (ITIL 4)** | Pengajuan perubahan infrastruktur, penilaian risiko (*Impact & Risk Matrix*), rencana rollback darurat, dan persetujuan dewan penasihat perubahan (*Change Advisory Board - CAB*). |
| 🔍 **Problem Management & RCA** | Investigasi akar masalah insiden berulang, analisis 5-Why, pelacakan *Known Error Database (KEDB)*, dan dokumentasi solusi permanen (*workaround*). |
| 💻 **Asset & Inventory (CMDB)** | Manajemen inventaris perangkat TI, spesifikasi hardware, status garansi, nilai aset finansial, dan asosiasi perangkat dengan pengguna atau tiket terkait. |
| 📡 **RMM Endpoint Monitoring Agent** | Daemon background lintas platform (`macOS LaunchAgent`, `Linux Systemd`, `Windows Task Scheduler`) yang memantau telemetri real-time (CPU, RAM, Disk), aplikasi aktif di foreground, live screen preview desktop, dan popup pesan remote. |
| 🛡️ **Enterprise Audit & Security Logs** | Pencatatan menyeluruh untuk login berhasil/gagal, perubahan tiket, manajemen pengguna, dan update branding dengan alamat IP, browser, OS, serta inspeksi visual JSON diff perbandingan sebelum & sesudah diubah. |
| 🎨 **Brand, Logo, Favicon & Theme Studio** | Kustomisasi favicon tab browser, logo banner memanjang (*wide text logo*), nama portal, versi `v1.0.0` di bawah logo, 6 preset tema 1-klik, live hex color pickers, dan switch mode Dark/Light. |
| 🔐 **Zimbra LDAP & Enterprise SSO** | Autentikasi ganda: Database lokal dan Zimbra Mail Server LDAP (`mail.bangden.my.id`), sinkronisasi otomatis nama, email, dan departemen. |
| 📧 **SMTP Email & Telegram Gateway** | Pengiriman notifikasi tiket instan berbasis Laravel `defer()` non-blocking (<50ms), fallback DNS IP otomatis, dan kustomisasi template pesan HTML. |
| 🛠️ **IT Diagnostics & Troubleshooting Tools** | Utilitas jaringan dan server bawaan: Ping Tester, Port Scanner, Traceroute, DNS Lookup, SSL Certificate Inspector, IP Whois Lookup, Password Generator, dan JWT Inspector. |

---

## 🏗️ Arsitektur & Struktur Direktori

```text
ITSM/
├── laravel/                      # Core Backend & API Framework (Laravel 11 / 12)
│   ├── app/
│   │   ├── Http/Controllers/Api/ # API Controllers (Ticket, User, Branding, Audit, Tools, dll)
│   │   ├── Models/               # Eloquent Models & Relasi Database
│   │   └── Services/             # LdapService, EmailNotificationService, TelegramService, AuditLogger
│   ├── database/
│   │   ├── migrations/           # Skema Migrasi Database Terversi
│   │   ├── seeders/              # Idempotent Database Seeders & Akun Superadmin
│   │   └── database.sqlite       # File Database Lokal (Development)
│   ├── public/                   # Web Root & Frontend Assets
│   │   ├── agent/                # Distribusi Script Endpoint Agent (itsm-agent)
│   │   ├── css/                  # Modern Responsive CSS (main.css, components.css)
│   │   ├── js/                   # Frontend Controller & Modular Modules (SPA)
│   │   ├── index.html            # Halaman Login Single-Page
│   │   └── app.html              # Halaman Dashboard & Backoffice Portal
│   ├── routes/
│   │   └── api.php               # RESTful API Endpoints (Sanctum Authenticated)
│   └── tests/                    # Feature & Unit Test Suite (42 Passed)
├── agent/                        # Endpoint Monitoring Daemon Source
│   ├── itsm-agent.py             # Python Telemetry & Screencapture Core
│   ├── install-agent.sh          # Auto-installer untuk macOS (LaunchAgent) & Linux (Systemd)
│   └── install-agent.ps1         # Auto-installer untuk Windows (Task Scheduler)
├── deploy/                       # Template Konfigurasi Server Production
│   ├── nginx-itsm.conf           # Virtual Host Nginx dengan Gzip & Security Headers
│   ├── itsm-queue.service        # Systemd Unit untuk Worker Notifikasi Email & Telegram
│   └── itsm-server.service       # Systemd Unit untuk Standalone Server
├── docker/                       # Konfigurasi Container Docker
│   ├── nginx.conf                # Nginx Server di Container
│   ├── supervisord.conf          # Supervisor Process Manager
│   └── entrypoint.sh             # Startup Auto-Migration & Permission Link
├── docker-compose.yml            # 1-Command Docker Deployment (App + MySQL + Redis)
├── Dockerfile                    # Multi-stage Production Docker Image
├── setup.sh                      # 1-Click Auto-Installer untuk VPS & Home Server
├── .env.example                  # Template Variabel Lingkungan Lengkap
└── README.md                     # Dokumentasi Resmi Sistem
```

---

## 💻 Kebutuhan Sistem (System Requirements)

### Spesifikasi Hardware
* **Minimum:** 1 vCPU, 1 GB RAM, 10 GB SSD Storage
* **Rekomendasi (Production):** 2+ vCPU, 2 GB - 4 GB RAM, 25 GB+ SSD Storage

### Kebutuhan Perangkat Lunak
* **Sistem Operasi:** Ubuntu 22.04 / 24.04 LTS, Debian 11 / 12, AlmaLinux 9, Rocky Linux 9, atau macOS
* **PHP:** Versi `>= 8.3` (Laravel 13 framework memerlukan PHP 8.3 atau 8.4)
* **Ekstensi PHP Wajib:** `bcmath`, `curl`, `dom`, `fileinfo`, `filter`, `gd`, `intl`, `json`, `ldap`, `mbstring`, `openssl`, `pcre`, `pdo`, `pdo_mysql` (atau `pdo_pgsql` / `pdo_sqlite`), `xml`, `zip`
* **Composer:** Versi `>= 2.2`
* **Web Server:** Nginx (Sangat direkomendasikan) atau Apache (dengan `mod_rewrite`)
* **Database:** MySQL 8.0+, MariaDB 10.6+, PostgreSQL 14+, atau SQLite 3

---

## 🚀 Panduan Lengkap Deployment ke VPS Produksi

Ikuti langkah-langkah di bawah ini secara berurutan saat menyiapkan server VPS baru:

### Langkah 1: Persiapan Server & Install Dependensi

Buka terminal SSH VPS Anda dan jalankan perintah instalasi dependensi:

#### 🐧 **Untuk Ubuntu 22.04 / 24.04 LTS & Debian 11 / 12:**
```bash
# 1. Update paket sistem
sudo apt update && sudo apt upgrade -y

# 2. Pasang repository PPA PHP (Ondřej Surý)
sudo apt install -y software-properties-common lsb-release ca-certificates apt-transport-https
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# 3. Install PHP 8.3, semua ekstensi wajib, Git, Curl & Unzip
sudo apt install -y \
  php8.3-cli php8.3-fpm php8.3-mysql php8.3-pgsql php8.3-sqlite3 \
  php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath \
  php8.3-gd php8.3-intl php8.3-ldap php8.3-redis unzip git curl

# 4. Set PHP 8.3 sebagai versi default CLI
sudo update-alternatives --set php /usr/bin/php8.3

# 5. Install Composer secara Global
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer

# 6. Install Nginx, MySQL Server & Certbot SSL
sudo apt install -y nginx mysql-server certbot python3-certbot-nginx
```

#### 🔴 **Untuk AlmaLinux / Rocky Linux / RHEL / CentOS 9:**
```bash
# 1. Install EPEL & Remi Repository
sudo dnf install -y epel-release https://rpms.remirepo.net/enterprise/remi-release-9.rpm
sudo dnf module reset php -y
sudo dnf module enable php:remi-8.3 -y

# 2. Install PHP 8.3 & extensions
sudo dnf install -y \
  php-cli php-fpm php-mysqlnd php-pgsql php-pdo php-mbstring \
  php-xml php-curl php-zip php-bcmath php-gd php-intl php-ldap \
  nginx mariadb-server git unzip curl

# 3. Install Composer Global
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer
```

---

### Langkah 2: Setup Database Server (MySQL / MariaDB)

Masuk ke MySQL prompt di VPS Anda:
```bash
sudo mysql
```

Jalankan query SQL berikut untuk membuat database dan user:
```sql
CREATE DATABASE itsm_enterprise CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'itsm_user'@'localhost' IDENTIFIED BY 'PasswordKuatAnda_123!';
GRANT ALL PRIVILEGES ON itsm_enterprise.* TO 'itsm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

### Langkah 3: Clone Repository & Konfigurasi `.env`

Unduh source code ke direktori `/var/www/itsm`:
```bash
# 1. Clone repository
sudo git clone https://github.com/mdenniandrian/itsm.git /var/www/itsm
cd /var/www/itsm

# 2. Salin template environment
cp .env.example .env

# 3. Edit file .env sesuai konfigurasi domain & database Anda
nano .env
```

Pastikan variabel database dan URL berikut sudah disesuaikan:
```dotenv
APP_NAME="ITSM Enterprise"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://itsm.yourcompany.com
APP_TIMEZONE=Asia/Jakarta

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=itsm_enterprise
DB_USERNAME=itsm_user
DB_PASSWORD=PasswordKuatAnda_123!
```

---

### Langkah 4: Jalankan Auto-Installer (`setup.sh`)

Cukup jalankan 1 perintah installer ini:
```bash
chmod +x setup.sh
./setup.sh
```

**Skrip `./setup.sh` akan secara otomatis:**
1. Menginstall seluruh dependensi Composer versi production (`--optimize-autoloader`).
2. Menghasilkan Application Encryption Key (`php artisan key:generate`).
3. Menjalankan migrasi database & default seeder (`php artisan migrate --force --seed`).
4. Membuat symlink file storage (`php artisan storage:link`).
5. Mengatur hak akses folder (`chmod 775 storage bootstrap/cache` dan kepemilikan `www-data`).
6. Melakukan kompilasi cache performa production (*config, route, view cache*).

---

### Langkah 5: Konfigurasi Web Server Nginx & SSL HTTPS

#### 1. Salin template virtual host Nginx:
```bash
sudo cp deploy/nginx-itsm.conf /etc/nginx/sites-available/itsm.conf
sudo nano /etc/nginx/sites-available/itsm.conf
```
*(Sesuaikan baris `server_name itsm.yourcompany.com;` dengan domain Anda dan pastikan `root /var/www/itsm/laravel/public;`)*

#### 2. Aktifkan vhost & reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/itsm.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. Pasang Sertifikat SSL Gratis (Let's Encrypt HTTPS):
```bash
sudo certbot --nginx -d itsm.yourcompany.com
```

---

### Langkah 6: Aktifkan Background Queue Worker (Systemd)

Untuk memproses pengiriman notifikasi email tiket dan integrasi Telegram Bot secara asinkron di background 24/7:

```bash
# 1. Pasang file service systemd
sudo cp deploy/itsm-queue.service /etc/systemd/system/itsm-queue.service

# 2. Reload daemon & aktifkan service
sudo systemctl daemon-reload
sudo systemctl enable --now itsm-queue.service

# 3. Cek status service
sudo systemctl status itsm-queue.service
```

---

### Langkah 7: Akses Portal & Kredensial Super Administrator

Buka browser Anda dan akses domain yang telah dikonfigurasi:

- **URL Portal:** `https://itsm.yourcompany.com/` (atau `http://IP-VPS-ANDA/`)
- **Email:** `admin@itsm.com`
- **Password:** `admin123`
- **Role:** Super Administrator (Akses Penuh Semua Modul)

*(Setelah berhasil masuk, segera ganti password akun melalui menu **Account &rarr; My Profile**).*

---

### Langkah 8: Hubungkan Endpoint Agent di Komputer Client

Untuk memantau perangkat client secara live (CPU, RAM, Disk, Active App, Live Screen Preview), pasang agent di komputer client:

#### 🍏 **macOS & 🐧 Linux (Terminal):**
```bash
curl -sSL https://itsm.yourcompany.com/agent/install-agent.sh | bash -s "https://itsm.yourcompany.com"
```
*(Otomatis mendaftarkan daemon **macOS LaunchAgent** / **Linux Systemd** bernama `itsm-agent` yang otomatis hidup setiap kali komputer booting/reboot).*

#### 🪟 **Windows (PowerShell):**
```powershell
& { $h='https://itsm.yourcompany.com'; irm "$h/agent/install-agent.ps1" | iex }
```
*(Otomatis mendaftarkan **Windows Task Scheduler** bernama `ITSMEndpointAgent` yang menjalankan `itsm-agent.exe` saat user login).*

---

## 🐳 Opsi Deployment Alternatif: Docker / Docker Compose

Jika Anda ingin menjalankan ITSM di lingkungan container (Home Server, Proxmox, Synology NAS, atau Portainer):

```bash
# 1. Clone repository
git clone https://github.com/mdenniandrian/itsm.git
cd itsm

# 2. Jalankan seluruh container stack (Nginx + PHP 8.2 + MySQL)
docker compose up -d
```

Akses portal melalui browser di `http://IP-SERVER-ANDA:8000`.

---

## 📊 Tabel Referensi Konfigurasi (`.env`)

| Variabel | Lingkungan Lokal (Dev) | Lingkungan VPS Produksi | Keterangan |
| :--- | :--- | :--- | :--- |
| `APP_ENV` | `local` | `production` | Mode aplikasi |
| `APP_DEBUG` | `true` | `false` | Sembunyikan detail error di produksi |
| `APP_URL` | `http://localhost:8000` | `https://itsm.yourcompany.com` | URL domain publik |
| `DB_CONNECTION` | `sqlite` atau `mysql` | `mysql` atau `pgsql` | Driver database |
| `LOG_CHANNEL` | `stack` | `daily` | Rotasi log otomatis per hari |
| `LOG_LEVEL` | `debug` | `info` | Level pencatatan log |
| `SESSION_DRIVER` | `database` | `database` / `redis` | Driver penyimpanan session |
| `QUEUE_CONNECTION` | `database` | `database` / `redis` | Driver antrean notifikasi |

---

## 🧪 Pengujian Otomatis (Automated Testing)

Seluruh modul aplikasi telah divalidasi dengan rangkaian automated test suite menyeluruh (Authentication, Ticket Lifecycle, SLA, Service Catalog, Problem Management, Change CAB, Audit Logs, Diagnostics):

```bash
cd laravel
php artisan test
```

```text
Tests:    42 passed (155 assertions)
Duration: ~5.4s
```

---

## 📄 Hak Cipta & Pengembang

* **Pengembang:** Muhammad Denni Andrian ([@mdenniandrian_](https://instagram.com/mdenniandrian_))
* **Entitas Perusahaan:** PT Bangden Digital Solusindo ([bangden.my.id](https://bangden.my.id))
* **Lisensi:** [MIT License](LICENSE)
