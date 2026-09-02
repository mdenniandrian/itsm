# 🚀 Panduan Deployment ITSM Enterprise (VPS & Home Server)

Aplikasi **ITSM Enterprise** dirancang agar dapat di-deploy dengan sangat mudah dan instan di berbagai lingkungan server (VPS Linux Ubuntu/Debian/AlmaLinux, Cloud Server, Home Server / Homelab / Proxmox, Synology NAS, Docker / Portainer, atau Bare-Metal).

---

## ⚡ Metode 1: Instalasi Otomatis Menggunakan Script (Direkomendasikan untuk VPS)

Setelah melakukan `git clone` repository ke VPS Anda:

```bash
# 1. Masuk ke folder project
cd ITSM

# 2. Berikan izin eksekusi dan jalankan auto-installer
chmod +x setup.sh
./setup.sh
```

**Apa yang otomatis dilakukan oleh `./setup.sh`:**
1. Otomatis membuat `.env` dari `.env.example` jika belum ada.
2. Menginstall semua dependensi PHP & Composer versi production (`--no-dev --optimize-autoloader`).
3. Meng-generate `APP_KEY` keamanan enkripsi Laravel secara otomatis.
4. Menyiapkan database (SQLite/MySQL/PostgreSQL) dan menjalankan seluruh migrasi tabel & seeder awal (`php artisan migrate --force --seed`).
5. Membuat symlink file storage (`php artisan storage:link`).
6. Mengatur permission folder (`chmod 775 storage bootstrap/cache` dan kepemilikan `www-data`).
7. Melakukan kompilasi & optimasi cache production (*config, route, view cache*).

---

## 🐳 Metode 2: Deploy Menggunakan Docker / Portainer (Home Server & Cloud)

Jika server atau NAS Anda sudah terpasang Docker & Docker Compose:

```bash
# 1. Jalankan seluruh stack (ITSM Web App + MySQL Database)
docker compose up -d

# 2. Buka browser:
# http://IP-SERVER-ANDA:8000
```

Semua konfigurasi database, migrasi tabel, dan cron queue worker sudah otomatis berjalan di dalam container.

---

## 🌐 Metode 3: Konfigurasi Nginx Production di VPS (Domain & SSL HTTPS)

### 1. Copy file konfigurasi Nginx:
```bash
sudo cp deploy/nginx-itsm.conf /etc/nginx/sites-available/itsm.conf
```

### 2. Edit domain dan path folder:
```bash
sudo nano /etc/nginx/sites-available/itsm.conf
```
*(Ubah `server_name itsm.yourcompany.com;` dan path `root /var/www/itsm/laravel/public;`)*

### 3. Aktifkan vhost & reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/itsm.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Pasang SSL Gratis (Let's Encrypt HTTPS):
```bash
sudo certbot --nginx -d itsm.yourcompany.com
```

---

## ⚙️ Menjalankan Background Worker Notifikasi (Systemd Queue)

Untuk pengiriman email notifikasi tiket dan integrasi bot Telegram secara real-time di background:

```bash
# 1. Salin file service systemd
sudo cp deploy/itsm-queue.service /etc/systemd/system/itsm-queue.service

# 2. Aktifkan service
sudo systemctl daemon-reload
sudo systemctl enable --now itsm-queue.service

# 3. Cek status service
sudo systemctl status itsm-queue.service
```

---

## 🔑 Kredensial Akun Default Super Administrator

Setelah instalasi selesai, Anda dapat langsung login menggunakan akun bawaan:

- **URL Login:** `http://IP-ATAU-DOMAIN-ANDA/`
- **Email:** `admin@itsm.com`
- **Password:** `admin123`

*(Setelah berhasil masuk, disarankan segera mengganti password di menu **Account &rarr; My Profile**).*

---

## 💻 Panduan Menghubungkan Endpoint Agent (RMM Device Monitoring) ke Server Production

Endpoint Agent digunakan untuk memantau penggunaan resource (CPU/RAM/Disk), aplikasi aktif, tangkapan layar live, dan remote popup pesan dari portal ITSM.

Agent secara otomatis menyesuaikan target server sesuai dengan domain atau IP yang Anda tentukan:

### 1. Instalasi Otomatis dari Menu Portal (Paling Mudah)
1. Buka menu **IT Operations &rarr; Device Monitoring** di sidebar.
2. Klik tombol **"Enroll Device"**.
3. Sistem secara otomatis mendeteksi domain/IP portal yang sedang dibuka (`window.location.origin`) dan menyajikan 1-baris perintah instan untuk di-copy ke laptop/PC client.

### 2. Perintah Manual Berdasarkan OS Client:

#### 🍏 **macOS & 🐧 Linux (Terminal):**
```bash
# Menggunakan Domain Production (HTTPS):
curl -sSL https://itsm.yourcompany.com/agent/install-agent.sh | bash -s "https://itsm.yourcompany.com"

# Atau jika menggunakan IP VPS:
curl -sSL http://103.xxx.xxx.xxx:8000/agent/install-agent.sh | bash -s "http://103.xxx.xxx.xxx:8000"
```

#### 🪟 **Windows (PowerShell):**
Buka PowerShell di komputer client Windows lalu jalankan:
```powershell
# Menggunakan Domain Production (HTTPS):
& { $h='https://itsm.yourcompany.com'; irm "$h/agent/install-agent.ps1" | iex }

# Atau jika menggunakan IP VPS:
& { $h='http://103.xxx.xxx.xxx:8000'; irm "$h/agent/install-agent.ps1" | iex }
```

#### 🐍 **Eksekusi Langsung via Python:**
```bash
# Menjalankan dengan URL Server Production:
python3 itsm-agent.py https://itsm.yourcompany.com

# Atau menggunakan environment variable:
export ITSM_SERVER_URL="https://itsm.yourcompany.com"
python3 itsm-agent.py
```

> **Tips:** Sekali agent berhasil terdaftar, token perangkat dan URL server production akan otomatis tersimpan di file `~/.itsm_device_token.json` di PC client, sehingga jika komputer client di-restart, agent akan tetap terhubung ke server production yang sama.

