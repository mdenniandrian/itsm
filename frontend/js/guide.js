/**
 * ITSM ENTERPRISE - COMPREHENSIVE SYSTEM FEATURES & MULTI-ROLE USAGE GUIDE
 */

window.featuresData = [
  {
    id: 'tickets',
    category: 'servicedesk',
    categoryName: 'Service Desk & Tickets',
    roles: ['admin', 'manager', 'agent', 'user'],
    icon: 'ticket',
    title: 'Incident & Service Ticket Management',
    badge: 'CORE ITIL',
    badgeColor: '#6366f1',
    targetPage: 'tickets',
    summary: 'Pusat komando penanganan keluhan, gangguan teknis, dan permintaan layanan IT dari seluruh karyawan perusahaan.',
    purpose: 'Menghilangkan kekacauan laporan manual (via chat WhatsApp/email pribadi). Semua laporan tercatat rapi dengan nomor tiket unik, antrean terpusat, SLA waktu penyelesaian yang terukur, dan rekam jejak solusi yang transparan.',
    scenario: 'Karyawan bagian Finance tidak bisa mencetak faktur karena printer kantor error. Karyawan membuat tiket, sistem otomatis menetapkan SLA 4 jam, menugaskan teknisi Hardware, dan mengirim email progres hingga selesai disertai rating kepuasan bintang 5.',
    roleGuidance: {
      user: 'Gunakan untuk melaporkan kendala teknis, melacak progres perbaikan, dan memberikan rating bintang 1-5 saat selesai.',
      agent: 'Gunakan untuk mengambil antrean tiket, mengubah status pengerjaan, dan menulis catatan teknis internal.',
      manager: 'Gunakan untuk memonitor beban kerja antrean tiket dan mendisposisikan tiket darurat ke teknisi yang tepat.',
      admin: 'Gunakan untuk pengawasan global, konfigurasi SLA, eskalasi tiket, dan audit riwayat penanganan.'
    },
    capabilities: [
      '<b>Siklus Hidup Terstandar:</b> Status New, In Progress, Pending (User/Vendor), Resolved, Closed.',
      '<b>Prioritas & SLA Countdown:</b> Critical (1 Jam), High (4 Jam), Medium (8 Jam), Low (24 Jam).',
      '<b>Kolaborasi Ganda:</b> Balasan publik ke karyawan & Catatan rahasia internal khusus teknisi.',
      '<b>Rating Kepuasan (CSAT):</b> Evaluasi bintang 1-5 dan ulasan feedback kepuasan penanganan.',
      '<b>1-Click Action Hub:</b> Ganti status kilat dan alihkan penugasan teknisi tanpa repot.'
    ]
  },
  {
    id: 'services',
    category: 'servicedesk',
    categoryName: 'Service Desk & Tickets',
    roles: ['admin', 'manager', 'agent', 'user'],
    icon: 'catalog',
    title: 'Service Catalog (Portal Permintaan Layanan)',
    badge: 'SELF-SERVICE',
    badgeColor: '#0ea5e9',
    targetPage: 'services',
    summary: 'Menu etalase layanan IT standar untuk pengajuan fasilitas kerja baru secara mandiri oleh karyawan.',
    purpose: 'Menstandarisasi prosedur permintaan barang/layanan IT (misal laptop baru, akses VPN kantor, lisensi software). Karyawan tahu persis syarat yang dibutuhkan dan berapa hari estimasi proses penyediaannya.',
    scenario: 'Karyawan baru bergabung di divisi Marketing dan butuh akun Zimbra Mail, akses VPN kantor, dan lisensi Adobe Illustrator. Karyawan memilih item dari katalog, mengisi form spesifikasi, dan tiket pengadaan langsung masuk ke antrean IT.',
    roleGuidance: {
      user: 'Pilih item layanan yang Anda butuhkan (Hardware/Software/Akses) dan isi formulir pengajuan tanpa perlu tatap muka.',
      agent: 'Lihat daftar pesanan layanan yang masuk dan siapkan perlengkapan teknis sesuai spesifikasi yang diminta.',
      manager: 'Evaluasi item katalog yang paling sering dipesan untuk perencanaan anggaran pengadaan IT kantor.',
      admin: 'Tambah, ubah, atau hapus daftar layanan yang ditawarkan di etalase katalog serta atur target SLA-nya.'
    },
    capabilities: [
      '<b>Katalog Terstruktur:</b> Kategori Perangkat Hardware, Lisensi Aplikasi, Hak Akses, Jaringan.',
      '<b>Estimasi Waktu Jelas (SLA):</b> Informasi target penyelesaian per jenis barang/layanan.',
      '<b>Formulir Permintaan Pintar:</b> Checklist persyaratan dan spesifikasi kebutuhan otomatis.',
      '<b>Integrasi Langsung ke Tiket:</b> Permintaan langsung diubah menjadi tiket tugas bagi tim IT.'
    ]
  },
  {
    id: 'knowledge',
    category: 'servicedesk',
    categoryName: 'Service Desk & Tickets',
    roles: ['admin', 'manager', 'agent', 'user'],
    icon: 'book',
    title: 'Knowledge Base (Basis Pengetahuan & Panduan SOP)',
    badge: 'KNOWLEDGE',
    badgeColor: '#10b981',
    targetPage: 'knowledge',
    summary: 'Perpustakaan digital panduan teknis, tutorial cara kerja, solusi masalah umum, dan SOP operasional IT.',
    purpose: 'Mengurangi beban kerja teknisi dari pertanyaan berulang (misal: "Bagaimana cara konek WiFi kantor?" atau "Cara reset password email?"). Karyawan bisa mandiri mencari panduan dan memperbaiki kendala ringannya sendiri.',
    scenario: 'Karyawan ingin menyambungkan printer baru ke laptop macOS-nya. Alih-alih memanggil tim IT, karyawan mengetik "Setup Printer" di Knowledge Base, membaca panduan bergambar langkah demi langkah, dan kendala selesai dalam 3 menit.',
    roleGuidance: {
      user: 'Cari panduan langkah-demi-langkah mandiri untuk mengatasi kendala ringan sebelum membuat tiket.',
      agent: 'Tulis artikel solusi dari insiden yang berhasil diselesaikan agar bisa dibaca rekan teknisi lain.',
      manager: 'Pantau artikel mana yang paling bermanfaat dalam mengurangi jumlah tiket komplain.',
      admin: 'Kelola kategori artikel, publikasikan SOP resmi, dan atur hak akses artikel publik vs internal.'
    },
    capabilities: [
      '<b>Solusi Mandiri Karyawan:</b> Panduan langkah demi langkah bergambar dan tutorial praktis.',
      '<b>Kategori Terorganisir:</b> Troubleshooting Jaringan, Setup Email Zimbra, Software, Hardware.',
      '<b>Pencarian Instan Cepat:</b> Mengetik kata kunci langsung memunculkan artikel solusi relevan.',
      '<b>Pemisahan Akses:</b> Artikel publik untuk seluruh staf vs SOP privat khusus tim teknisi.'
    ]
  },
  {
    id: 'kpi',
    category: 'analytics',
    categoryName: 'IT Operations & Analytics',
    roles: ['admin', 'manager', 'agent'],
    icon: 'kpi',
    title: 'KPI & SLA Analytics Dashboard',
    badge: 'EXECUTIVE BI',
    badgeColor: '#f59e0b',
    targetPage: 'kpi',
    summary: 'Pusat intelijen bisnis dan grafik performa operasional IT untuk evaluasi kinerja teknisi dan kepatuhan SLA.',
    purpose: 'Memberikan visibilitas kepada Manajer dan Direktur IT mengenai efisiensi tim IT: Berapa tiket yang sukses diselesaikan tepat waktu? Siapa teknisi paling produktif? Departemen mana yang paling sering mengalami kendala teknis?',
    scenario: 'Setiap akhir bulan, IT Manager membuka halaman KPI untuk mengunduh laporan bulanan. Terlihat bahwa 98.4% tiket terpenuhi sesuai SLA dan nilai rata-rata kepuasan pengguna (CSAT) mencapai 4.9/5.0.',
    roleGuidance: {
      user: 'Khusus staf IT & Pimpinan (Karyawan umum dapat melihat status penyelesaian tiket pribadinya di My Tickets).',
      agent: 'Pantau kecepatan waktu respon (First Response) dan pencapaian target SLA resolusi harian Anda.',
      manager: 'Analisis beban kerja tim, kepatuhan SLA keseluruhan, dan tren rating kepuasan CSAT pelanggan.',
      admin: 'Evaluasi metrik efisiensi operasional IT secara menyeluruh untuk bahan laporan audit manajemen.'
    },
    capabilities: [
      '<b>SLA Compliance Rate:</b> Persentase keberhasilan penyelesaian tiket sebelum batas waktu.',
      '<b>MTTR (Mean Time to Resolve):</b> Rata-rata durasi kecepatan perbaikan insiden per kategori.',
      '<b>Bagan Beban Kerja Teknisi:</b> Grafik perbandingan jumlah tiket aktif per teknisi IT.',
      '<b>Analitik Kepuasan CSAT:</b> Rata-rata bintang kepuasan dan tren kualitas layanan bulanan.',
      '<b>Grafik Kontras Tinggi:</b> Visualisasi doughnut dan bar chart ramah mode gelap (*Dark Mode*).'
    ]
  },
  {
    id: 'devices',
    category: 'analytics',
    categoryName: 'IT Operations & Analytics',
    roles: ['admin', 'manager', 'agent'],
    icon: 'devices',
    title: 'Endpoint & Server Monitoring (RMM Agent)',
    badge: 'REMOTE RMM',
    badgeColor: '#8b5cf6',
    targetPage: 'devices',
    summary: 'Sistem pemantauan kesehatan komputer klien dan server jarak jauh secara otomatis dengan agen latar belakang.',
    purpose: 'Mencegah kerusakan server dan mendeteksi komputer karyawan yang bermasalah sebelum komplain terjadi (misal: harddisk hampir penuh 95% atau CPU terus-menerus 100%). IT bisa langsung proaktif mengambil tindakan pencegahan.',
    scenario: 'Server database produksi mengalami lonjakan penggunaan memori RAM hingga 92%. Agen RMM mendeteksi lonjakan tersebut dan status server di panel langsung menyala kuning/merah sehingga admin segera melakukan optimasi query.',
    roleGuidance: {
      user: 'Fitur pemantauan otomatis (Karyawan cukup mengizinkan instalasi agen ringan pada laptop kantor).',
      agent: 'Pantau kesehatan mesin klien (CPU/RAM/Disk), identifikasi laptop yang lelet, dan daftarkan mesin baru.',
      manager: 'Pantau total inventaris server & workstation aktif serta tingkat utilisasi hardware perusahaan.',
      admin: 'Kelola token enroll perangkat, salin script instalasi/uninstall lintas OS (Mac/Linux/Windows).'
    },
    capabilities: [
      '<b>Agen Multi-Platform:</b> Daemon otomatis untuk macOS (*LaunchAgent*), Linux (*Systemd*), Windows (*Task*).',
      '<b>Telemetri Real-Time:</b> Monitor beban CPU, sisa RAM, kapasitas Harddisk, dan Uptime perangkat.',
      '<b>Auto-Enrollment 1 Baris:</b> Perintah instalasi cURL / PowerShell langsung mendaftarkan mesin.',
      '<b>Deteksi Mesin Offline:</b> Mengetahui komputer/server mana yang mati atau terputus dari jaringan.',
      '<b>Uninstaller 1-Klik:</b> Generator script pencopotan agen bersih tanpa sisa proses di latar belakang.'
    ]
  },
  {
    id: 'tools',
    category: 'analytics',
    categoryName: 'IT Operations & Analytics',
    roles: ['admin', 'manager', 'agent'],
    icon: 'tools',
    title: 'IT Diagnostics & Network Swiss-Army Tools',
    badge: 'DIAGNOSTICS',
    badgeColor: '#ec4899',
    targetPage: 'tools',
    summary: 'Kumpulan perkakas uji jaringan, diagnostik server, dan keamanan digital lengkap langsung dari browser tanpa perlu buka terminal.',
    purpose: 'Mempercepat investigasi tim infrastruktur dan jaringan saat terjadi gangguan koneksi internet, port server tertutup, sertifikat SSL kedaluwarsa, atau kebutuhan membuat kata sandi rumit yang aman.',
    scenario: 'Karyawan mengeluhkan tidak bisa mengakses aplikasi internal di kantor cabang. Teknisi membuka menu Tools, melakukan Ping tester dan Port Scanner ke server cabang, dan langsung tahu bahwa port 443 terblokir oleh firewall lokal.',
    roleGuidance: {
      user: 'Khusus staf teknis (Karyawan dapat melaporkan kendala koneksi melalui form tiket).',
      agent: 'Gunakan Ping Tester, Port Scanner, dan DNS Lookup untuk investigasi cepat gangguan jaringan.',
      manager: 'Pantau masa berlaku sertifikat SSL domain perusahaan agar tidak terjadi gangguan expired.',
      admin: 'Gunakan generator password kuat, inspektur token JWT/Base64, dan pengujian koneksi server.'
    },
    capabilities: [
      '<b>ICMP Ping & Latency Tester:</b> Uji kestabilan latensi server (ms) dan persentase packet loss.',
      '<b>Multi-Port Scanner:</b> Cek status port TCP terbuka (HTTP 80, HTTPS 443, SSH 22, MySQL 3306, RDP 3389).',
      '<b>DNS Records Lookup:</b> Cek record domain lengkap (A, AAAA, MX, NS, TXT, CNAME, SOA).',
      '<b>SSL/TLS Inspector:</b> Cek masa berlaku sertifikat HTTPS, Issuer Authority, dan sisa hari sebelum expired.',
      '<b>Password Generator:</b> Buat password super kuat berstandar militer lengkap dengan indikator entropi.',
      '<b>Base64 & JWT Inspector:</b> Dekoder payload token otorisasi dan string enkripsi untuk debugging.'
    ]
  },
  {
    id: 'changes',
    category: 'itil',
    categoryName: 'ITIL Operations & Governance',
    roles: ['admin', 'manager', 'agent'],
    icon: 'changes',
    title: 'Change Management & CAB Approval (ITIL)',
    badge: 'GOVERNANCE',
    badgeColor: '#059669',
    targetPage: 'changes',
    summary: 'Manajemen perubahan sistem, upgrade infrastruktur, dan pemeliharaan server dengan persetujuan dewan teknis (CAB).',
    purpose: 'Mencegah terjadinya insiden atau pemadaman sistem (*system outage*) akibat teknisi melakukan perubahan server tanpa rencana mitigasi risiko dan tanpa rencana pembatalan (*rollback plan*) yang jelas.',
    scenario: 'Tim SysAdmin ingin melakukan upgrade versi database MySQL pada server utama. Rencana perubahan diajukan ke menu Changes, dinilai risikonya oleh dewan CAB, disetujui, dan dijadwalkan pada jendela pemeliharaan malam hari.',
    roleGuidance: {
      user: 'Dampak perubahan dijadwalkan pada jam non-kerja agar karyawan tidak terganggu saat bekerja.',
      agent: 'Ajukan proposal perubahan teknis lengkap dengan rencana mitigasi risiko dan langkah rollback.',
      manager: 'Bertindak sebagai dewan CAB untuk meninjau, menyetujui, atau menolak pengajuan perubahan server.',
      admin: 'Otorisasi perubahan darurat (Emergency Change) dan evaluasi pasca-implementasi perubahan.'
    },
    capabilities: [
      '<b>Kategori Perubahan Terstandar:</b> Tipe Standard (Rutin), Normal (Perlu CAB Review), Emergency.',
      '<b>Matriks Dampak & Risiko:</b> Penilaian skor risiko (High, Medium, Low) dan rencana pencegahan.',
      '<b>Rencana Rollback Wajib:</b> Dokumentasi langkah pembatalan darurat jika proses upgrade gagal.',
      '<b>Jadwal Jendela Eksekusi:</b> Pelacakan waktu pemeliharaan agar tidak mengganggu jam kerja operasional.'
    ]
  },
  {
    id: 'problems',
    category: 'itil',
    categoryName: 'ITIL Operations & Governance',
    roles: ['admin', 'manager', 'agent'],
    icon: 'problems',
    title: 'Problem Management & Root Cause Analysis (RCA)',
    badge: 'ITIL RCA',
    badgeColor: '#d97706',
    targetPage: 'problems',
    summary: 'Investigasi mendalam untuk mencari akar penyebab permanen dari insiden-insiden yang sering berulang.',
    purpose: 'Berbeda dengan Tiket yang fokus pada "penanganan cepat sementara", Problem Management fokus pada "mencari akar masalah utama agar gangguan yang sama tidak pernah terjadi lagi di masa depan".',
    scenario: 'Printer di lantai 3 mati mendadak 5 kali dalam seminggu. Tim IT membuka Problem Record, melakukan investigasi RCA, dan menemukan bahwa kabel power regulator di stopkontak dinding longgar. Setelah diganti, printer tidak pernah mati lagi.',
    roleGuidance: {
      user: 'Membantu pengguna dengan melenyapkan gangguan berulang sehingga sistem kantor selalu stabil.',
      agent: 'Lakukan investigasi teknis mendalam (RCA) dan catat solusi sementara di database Known Error.',
      manager: 'Tinjau problem aktif yang memiliki dampak finansial/operasional tinggi dan alokasikan sumber daya.',
      admin: 'Kaitkan insiden-insiden berulang menjadi satu problem record induk untuk penyelesaian tuntas.'
    },
    capabilities: [
      '<b>Analisis Akar Masalah (RCA):</b> Form investigasi terstruktur mencari penyebab primer kendala.',
      '<b>Known Error Database (KEDB):</b> Katalog dokumentasi solusi sementara (*workaround*) bagi teknisi.',
      '<b>Asosiasi Banyak Tiket:</b> Menghubungkan puluhan keluhan user ke satu Problem pusat yang sama.'
    ]
  },
  {
    id: 'assets',
    category: 'itil',
    categoryName: 'ITIL Operations & Governance',
    roles: ['admin', 'manager', 'agent'],
    icon: 'assets',
    title: 'Asset Inventory & Hardware Lifecycle (ITAM)',
    badge: 'IT ASSETS',
    badgeColor: '#4f46e5',
    targetPage: 'assets',
    summary: 'Pencatatan dan pelacakan seluruh aset fisik IT, laptop karyawan, server kantor, dan lisensi perangkat lunak.',
    purpose: 'Menghindari hilangnya laptop kantor, mengetahui masa garansi hardware, memonitor sisa lisensi software perusahaan, dan mengetahui riwayat siapa saja karyawan yang pernah memegang laptop tertentu.',
    scenario: 'Karyawan bagian Akuntansi mengundurkan diri (*resign*). Tim HR dan IT membuka menu Asset Inventory dan langsung melihat daftar barang kantor yang wajib dikembalikan: 1 unit laptop ThinkPad T14 (Serial #PF2A...) dan 1 unit headset USB.',
    roleGuidance: {
      user: 'Melihat inventaris perangkat laptop atau alat kantor yang resmi ditugaskan atas nama Anda.',
      agent: 'Catat penerimaan aset baru, update lokasi perangkat, dan perbarui status perbaikan alat.',
      manager: 'Audit ketersediaan stok laptop cadangan dan rencanakan peremajaan hardware yang habis garansi.',
      admin: 'Kelola master data aset, alokasi lisensi software korporat, dan proses penghapusan aset lama.'
    },
    capabilities: [
      '<b>Registrasi Lengkap:</b> Nomor Tag Aset, Serial Number, Merk/Model, Tanggal Beli, Status Garansi.',
      '<b>Alokasi Pemegang:</b> Penugasan laptop/alat ke karyawan, nama departemen, atau lokasi cabang.',
      '<b>Status Siklus Aset:</b> In Use (Digunakan), In Storage (Gudang), Under Repair, Decommissioned.'
    ]
  },
  {
    id: 'users',
    category: 'security',
    categoryName: 'Security & Administration',
    roles: ['admin', 'manager'],
    icon: 'users',
    title: 'User Management, Active Sessions & Mail Validator',
    badge: 'SECURITY & SESSIONS',
    badgeColor: '#dc2626',
    targetPage: 'users',
    summary: 'Manajemen akun pengguna, hak akses RBAC, validasi email DNS global, dan pengontrol sesi login aktif / Force Logout.',
    purpose: 'Menjaga keamanan akun perusahaan. Memastikan email yang didaftarkan benar-benar aktif di DNS global (bukan email dummy/palsu), mengirim email sambutan kredensial login otomatis, serta memiliki Session Security Manager untuk memutuskan sesi login / Force Logout perangkat yang hilang/diretas.',
    scenario: 'Laptop staf IT hilang di perjalanan. Admin segera membuka menu User Management &rarr; klik tombol Sessions pada nama staf tersebut &rarr; klik "Clear All Sessions (Force Logout)". Seketika semua sesi login di laptop yang hilang tersebut langsung mati total.',
    roleGuidance: {
      user: 'Akun Anda dilindungi dengan standar keamanan email terverifikasi dan proteksi sesi aktif.',
      agent: 'Dapatkan tagging spesialisasi teknisi (Helpdesk, Jaringan, SysAdmin) pada profil kerja Anda.',
      manager: 'Daftarkan anggota tim baru dan kelola hak akses staf sesuai divisi kerjanya.',
      admin: 'Kendali penuh manajemen user, verifikasi DNS email, reset password, dan Force Logout sesi aktif.'
    },
    capabilities: [
      '<b>Hak Akses Multi-Tier (RBAC):</b> Administrator, Manager, Agent (Teknisi), User (Karyawan Biasa).',
      '<b>Tagging Spesialisasi Teknisi:</b> Menandai keahlian khusus (Helpdesk Tier 1, Jaringan, Zimbra Admin).',
      '<b>Live Global DNS MX Mail Checker:</b> Mengecek server email di internet secara real-time saat mengetik.',
      '<b>Session Security Manager:</b> Pantau perangkat, IP Address, token login aktif, dan jam terakhir aktif.',
      '<b>1-Click Force Logout:</b> Putuskan seluruh koneksi login user seketika dari seluruh browser & perangkat.',
      '<b>Welcome & Verification Email:</b> Kirim kredensial dan link portal otomatis ke inbox pengguna baru.'
    ]
  },
  {
    id: 'branding',
    category: 'security',
    categoryName: 'Security & Administration',
    roles: ['admin', 'manager'],
    icon: 'sparkles',
    title: 'Brand & UI Theme Studio (White-Label)',
    badge: 'WHITE-LABEL',
    badgeColor: '#7c3aed',
    targetPage: 'branding',
    summary: 'Studio kustomisasi visual untuk mengubah nama aplikasi, logo perusahaan, warna tema, dan ikon favicon di browser.',
    purpose: 'Membuat aplikasi portal ITSM ini terasa 100% seperti buatan in-house perusahaan Anda sendiri (*white-label*) dengan identitas merek, logo, hak cipta footer, dan warna tema korporat Anda.',
    scenario: 'Perusahaan memiliki warna korporat Hijau. Admin memilih tema Cyber Emerald di Brand Studio &rarr; seketika seluruh tombol, gradien, chart, dan ikon favicon di tab browser atas langsung berubah warna hijau serasi.',
    roleGuidance: {
      user: 'Menikmati antarmuka portal yang elegan, profesional, dan serasi dengan warna korporat kantor.',
      agent: 'Bekerja dengan visual dashboard yang nyaman di mata dengan mode gelap kontras tinggi.',
      manager: 'Memastikan identitas merek dan nama portal sesuai dengan panduan branding perusahaan.',
      admin: 'Kustomisasi logo, favicon dinamis, nama aplikasi, copyright footer, dan 1-click preset warna.'
    },
    capabilities: [
      '<b>Kustomisasi Identitas Merek:</b> Nama Aplikasi, Subjudul, Teks Hak Cipta Footer, Link Profil Pembuat.',
      '<b>Logo & Favicon Cerdas:</b> Upload logo kustom atau gunakan ikon Tameng SVG dinamis.',
      '<b>Favicon Tab Otomatis Berwarna:</b> Ikon di tab atas browser otomatis sinkron dengan warna tema aktif.',
      '<b>6 Preset Warna Populer:</b> Obsidian Indigo, Deep Ocean Blue, Cyber Emerald, Cyberpunk Violet, dll.',
      '<b>Live 3-Color Gradient Picker:</b> Atur warna kustom hex secara instan tanpa perlu reload halaman.'
    ]
  },
  {
    id: 'addons',
    category: 'integrations',
    categoryName: 'Integrations & Add-ons',
    roles: ['admin', 'manager'],
    icon: 'addons',
    title: 'Add-ons & Integrasi Pihak Ketiga',
    badge: 'INTEGRATIONS',
    badgeColor: '#2563eb',
    targetPage: 'addons',
    summary: 'Pintu gerbang integrasi dengan server email kantor (SMTP), bot chat Telegram, Single Sign-On (LDAP/AD), dan Webhooks.',
    purpose: 'Menghubungkan ITSM dengan ekosistem komunikasi kantor yang sudah ada. Teknisi tidak perlu terus-menerus memelototi dashboard karena notifikasi tiket baru langsung berbunyi di HP via bot Telegram dan email kantor.',
    scenario: 'Ketika ada karyawan yang submit tiket prioritas Critical, bot Telegram otomatis mengirimkan pesan alert ke grup Telegram IT Support dalam waktu 1 detik, dan email konfirmasi otomatis terkirim ke inbox pemohon.',
    roleGuidance: {
      user: 'Menerima konfirmasi instan lewat email kantor setiap kali tiket Anda dibuat atau selesai.',
      agent: 'Dapatkan notifikasi darurat langsung di HP via bot Telegram saat ada tiket baru yang ditugaskan.',
      manager: 'Pantau broadcast alert insiden kritis di grup chat Telegram pimpinan IT.',
      admin: 'Konfigurasi SMTP Gateway (Zimbra/Gmail), bot Telegram, LDAP/Active Directory SSO, & Webhooks.'
    },
    capabilities: [
      '<b>SMTP Email Gateway:</b> Kirim email notifikasi via Zimbra, Gmail App Password, Office365, atau Postfix.',
      '<b>Telegram Bot Integration:</b> Siaran notifikasi instan ke grup IT dan kirim pesan langsung ke teknisi.',
      '<b>LDAP / Active Directory SSO:</b> Login menggunakan username & password Windows domain kantor.',
      '<b>Webhooks & Slack:</b> Kirim event JSON real-time ke sistem pihak ketiga untuk otomatisasi lanjutan.'
    ]
  },
  {
    id: 'audit',
    category: 'security',
    categoryName: 'Security & Administration',
    roles: ['admin', 'manager'],
    icon: 'activity',
    title: 'Enterprise Security & Audit Logs',
    badge: 'COMPLIANCE & AUDIT',
    badgeColor: '#475569',
    targetPage: 'audit',
    summary: 'Buku catatan rekaman jejak digital (*audit trail*) anti-manipulasi yang merekam setiap aktivitas sensitif di dalam sistem.',
    purpose: 'Memenuhi standar kepatuhan audit keamanan TI perusahaan (ISO 27001). Jika terjadi insiden penghapusan data atau perubahan hak akses mencurigakan, admin bisa melacak siapa pelakunya, dari IP mana, jam berapa, dan apa data sebelum diubah.',
    scenario: 'Manajer ingin mengetahui siapa yang mengubah prioritas tiket dari Low menjadi Critical. Di Audit Log, tercatat jelas nama akun yang mengubah, dari komputer mana, jam berapa, dan nilai data sebelum vs sesudah diubah.',
    roleGuidance: {
      user: 'Menjamin seluruh aktivitas dan data pribadi Anda terlindungi serta tercatat secara aman.',
      agent: 'Setiap aksi penyelesaian tiket tercatat sebagai bukti profesionalitas kinerja kerja Anda.',
      manager: 'Audit kepatuhan SOP tim dan investigasi perubahan status tiket yang tidak wajar.',
      admin: 'Pantau log keamanan penuh, filter berdasarkan alamat IP, dan unduh laporan audit dalam format CSV.'
    },
    capabilities: [
      '<b>Jejak Digital Menyeluruh:</b> Rekam aktivitas login, buat user, ganti role, cabut sesi, dan edit tiket.',
      '<b>Analisis Klien & IP:</b> Menyimpan detail alamat IP, browser yang digunakan, dan sistem operasi.',
      '<b>Pembeda Nilai (Diff):</b> Memperlihatkan data sebelum diubah vs sesudah diubah secara presisi.',
      '<b>Export Laporan CSV:</b> Unduh seluruh riwayat log audit dalam 1 klik untuk kebutuhan audit auditor.'
    ]
  }
];

function getRoleGuidanceSummary(role) {
  const summaries = {
    user: 'Sebagai <b>User (Karyawan)</b>, Anda dapat menggunakan <b>Service Catalog</b> untuk meminta fasilitas kerja baru, memantau kendala di <b>Service Desk</b>, dan mencari solusi cepat di <b>Knowledge Base</b>.',
    agent: 'Sebagai <b>Agent (Teknisi IT)</b>, Anda bertugas mengeksekusi penyelesaian tiket keluhan, menulis catatan investigasi, memantau telemetri mesin di <b>Device Monitoring (RMM)</b>, dan menggunakan <b>IT Diagnostic Tools</b>.',
    manager: 'Sebagai <b>Manager (Pimpinan IT)</b>, Anda mengawasi kinerja operasional di <b>KPI Analytics</b>, memvalidasi persetujuan perubahan server di <b>CAB Changes</b>, meninjau akar masalah di <b>Problem Management</b>, dan mengelola <b>Asset Inventory</b>.',
    admin: 'Sebagai <b>Super Administrator</b>, Anda memegang kendali penuh atas seluruh 13 modul: kustomisasi <b>Brand Studio</b>, manajemen <b>User & Force Logout Sesi</b>, integrasi <b>Add-ons (SMTP/Telegram/LDAP)</b>, dan <b>Audit Security Logs</b>.'
  };
  return summaries[role] || summaries.user;
}

window.loadSystemGuide = function() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const userRole = (appState.user && appState.user.role) ? appState.user.role.toLowerCase() : 'user';

  content.innerHTML = `
    <div class="page-header" style="margin-bottom:1.25rem">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span style="font-size:1.6rem">📖</span>
          <h1 class="page-title" style="margin:0">Panduan Fitur & Dokumentasi Sistem (Multi-Role)</h1>
        </div>
        <p class="page-subtitle">Panduan komprehensif mengenai fungsi, manfaat bisnis, skenario penggunaan nyata, dan alur kerja untuk setiap peran pengguna</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('dashboard')">
          ${renderIcon('dashboard')}
          <span>Kembali ke Dashboard</span>
        </button>
      </div>
    </div>

    <!-- Personalized Role Banner -->
    <div class="card p-3 mb-4" style="background:linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(16,185,129,0.08) 100%);border:1px solid var(--border-primary)">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <div style="width:40px;height:40px;border-radius:50%;background:var(--accent-primary);color:white;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:bold;flex-shrink:0">
            ${userRole === 'admin' ? '👑' : userRole === 'manager' ? '👔' : userRole === 'agent' ? '🛠️' : '👤'}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-xs">Peran Akun Anda:</span>
              <span class="badge badge-primary font-bold text-xs" style="text-transform:uppercase;letter-spacing:0.5px">${userRole.toUpperCase()}</span>
            </div>
            <div class="text-xs text-secondary mt-0.5" style="line-height:1.5">
              ${getRoleGuidanceSummary(userRole)}
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-xs btn-primary" onclick="filterGuideRole('${userRole}', this)">
            ⭐ Khusus Peran Saya (${userRole.toUpperCase()})
          </button>
        </div>
      </div>
    </div>

    <!-- Interactive Search & Category Filter Toolbar -->
    <div class="card p-3 mb-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <!-- Search Input -->
        <div class="form-group mb-0" style="flex:1;min-width:280px;position:relative">
          <input type="text" class="form-control" id="guide-search-input" placeholder="🔍 Cari kegunaan fitur (contoh: SLA, Tiket, Katalog, Knowledge Base)..." oninput="filterGuideFeatures()">
        </div>

        <!-- Filter Category Tabs -->
        <div class="flex gap-1.5 flex-wrap" id="guide-category-filters">
          <button class="btn btn-xs ${userRole !== 'admin' ? 'btn-primary' : 'btn-secondary'} guide-cat-btn" data-category="myrole" onclick="filterGuideRole('${userRole}', this)">
            ⭐ Fitur Akun Saya (${userRole.toUpperCase()})
          </button>
          <button class="btn btn-xs ${userRole === 'admin' ? 'btn-primary' : 'btn-secondary'} guide-cat-btn" data-category="all" onclick="filterGuideCategory('all', this)">
            Semua Modul Sistem (${window.featuresData.length})
          </button>
          <button class="btn btn-xs btn-secondary guide-cat-btn" data-category="servicedesk" onclick="filterGuideCategory('servicedesk', this)">Service Desk</button>
          ${userRole !== 'user' ? `
            <button class="btn btn-xs btn-secondary guide-cat-btn" data-category="analytics" onclick="filterGuideCategory('analytics', this)">IT Ops & RMM</button>
            <button class="btn btn-xs btn-secondary guide-cat-btn" data-category="itil" onclick="filterGuideCategory('itil', this)">Standar ITIL</button>
          ` : ''}
          ${['admin','manager'].includes(userRole) ? `
            <button class="btn btn-xs btn-secondary guide-cat-btn" data-category="security" onclick="filterGuideCategory('security', this)">Keamanan & RBAC</button>
            <button class="btn btn-xs btn-secondary guide-cat-btn" data-category="integrations" onclick="filterGuideCategory('integrations', this)">Integrasi</button>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Feature Cards Grid -->
    <div id="guide-cards-container" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(380px, 1fr));gap:1.25rem">
      <!-- Injected via JavaScript -->
    </div>

    <!-- Role Permission Matrix Section -->
    <div class="card p-4 mt-6">
      <div class="flex items-center gap-2 mb-3">
        <span style="font-size:1.2rem">👥</span>
        <span class="card-title text-sm font-bold">Matriks Hak Akses & Pembagian Peran Pengguna (Role-Based Access Control)</span>
      </div>
      <div class="table-responsive">
        <table class="table text-xs">
          <thead>
            <tr>
              <th>Peran (Role)</th>
              <th>Pengguna Sasaran</th>
              <th>Modul yang Dapat Diakses</th>
              <th>Hak Istimewa & Kewenangan</th>
            </tr>
          </thead>
          <tbody>
            <tr style="${userRole === 'admin' ? 'background:rgba(99,102,241,0.08);font-weight:600' : ''}">
              <td><span class="badge badge-primary font-bold">Admin</span> ${userRole === 'admin' ? '<span class="text-xs text-primary">(Akun Anda)</span>' : ''}</td>
              <td>IT Director, System Administrator</td>
              <td><b>Seluruh 13 Modul:</b> Termasuk Brand Studio, Addons, User Management, dan Audit Security Logs</td>
              <td><span class="text-success font-bold">✓ Kontrol Penuh</span> (Buat/Hapus User, Force Logout Sesi, Setting SMTP/Telegram, White-Label)</td>
            </tr>
            <tr style="${userRole === 'manager' ? 'background:rgba(99,102,241,0.08);font-weight:600' : ''}">
              <td><span class="badge badge-accent font-bold">Manager</span> ${userRole === 'manager' ? '<span class="text-xs text-primary">(Akun Anda)</span>' : ''}</td>
              <td>Helpdesk Lead, Operations Manager</td>
              <td>Service Desk, KPI Analytics, RMM Devices, CAB Changes, Problems, Assets, KB</td>
              <td><span class="text-primary font-medium">✓ Otoritas Operasional</span> (Disposisi Tiket, Setujui Perubahan CAB, Pantau Performa Tim)</td>
            </tr>
            <tr style="${userRole === 'agent' ? 'background:rgba(99,102,241,0.08);font-weight:600' : ''}">
              <td><span class="badge badge-info font-bold">Agent</span> ${userRole === 'agent' ? '<span class="text-xs text-primary">(Akun Anda)</span>' : ''}</td>
              <td>IT Support Technician, Network Engineer</td>
              <td>Service Desk, Troubleshooting Tools, Knowledge Base, Devices Telemetry</td>
              <td><span class="text-accent font-medium">✓ Penyelesaian Teknis</span> (Update Tiket, Catatan Teknis Internal, Jalankan Diagnostik)</td>
            </tr>
            <tr style="${userRole === 'user' ? 'background:rgba(99,102,241,0.08);font-weight:600' : ''}">
              <td><span class="badge badge-secondary font-bold">User</span> ${userRole === 'user' ? '<span class="text-xs text-primary">(Akun Anda)</span>' : ''}</td>
              <td>Karyawan Umum, Seluruh Staf Perusahaan</td>
              <td>Service Catalog, Buat Tiket Keluhan, Tiket Saya, Baca Knowledge Base</td>
              <td><span class="text-muted">Akses Pelapor Saja</span> (Membuat Pengajuan & Menilai Kepuasan Bintang 1-5 Saat Tiket Selesai)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const initialItems = userRole === 'admin'
    ? window.featuresData
    : window.featuresData.filter(f => f.roles.includes(userRole));

  renderGuideCards(initialItems);
};

window.renderGuideCards = function(items) {
  const container = document.getElementById('guide-cards-container');
  if (!container) return;

  const currentRole = (appState.user && appState.user.role) ? appState.user.role.toLowerCase() : 'user';

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-muted" style="grid-column:1/-1">
        <div style="font-size:2.2rem;margin-bottom:0.5rem">🔍</div>
        <div class="font-bold text-sm">Tidak ditemukan fitur yang cocok</div>
        <div class="text-xs">Coba gunakan kata kunci pencarian lain atau klik tombol 'Semua Modul'.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(f => {
    const isAccessible = f.roles.includes(currentRole);
    const roleTip = (f.roleGuidance && f.roleGuidance[currentRole]) ? f.roleGuidance[currentRole] : f.purpose;

    return `
      <div class="card p-4 feature-card" style="display:flex;flex-direction:column;justify-content:space-between;border:1px solid var(--border-primary);border-radius:10px;transition:all 0.2s ease;${!isAccessible ? 'opacity:0.85' : ''}">
        <div>
          <!-- Card Header -->
          <div class="flex items-start justify-between gap-2 mb-2.5">
            <div class="flex items-center gap-2.5">
              <div style="width:38px;height:38px;border-radius:8px;background:rgba(99,102,241,0.1);color:var(--accent-primary);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0">
                ${renderIcon(f.icon)}
              </div>
              <div>
                <h3 class="font-bold text-sm" style="margin:0;line-height:1.3">${escHtml(f.title)}</h3>
                <span class="text-muted" style="font-size:0.7rem">${escHtml(f.categoryName)}</span>
              </div>
            </div>
            <span class="badge font-bold" style="font-size:0.65rem;background:${f.badgeColor}22;color:${f.badgeColor};border:1px solid ${f.badgeColor}44">
              ${escHtml(f.badge)}
            </span>
          </div>

          <!-- Summary -->
          <p class="text-xs text-secondary mb-2.5" style="line-height:1.5">
            ${escHtml(f.summary)}
          </p>

          <!-- Panduan Sesuai Peran Anda -->
          <div class="p-2.5 mb-2" style="background:rgba(99,102,241,0.06);border-radius:6px;border:1px solid rgba(99,102,241,0.2)">
            <div class="font-bold text-xs text-primary mb-1 flex items-center justify-between">
              <span class="flex items-center gap-1">
                <span>🎯</span>
                <span>Untuk Anda (${currentRole.toUpperCase()}):</span>
              </span>
              ${isAccessible ? '<span class="badge badge-success text-xs" style="font-size:0.6rem">Akses Terbuka</span>' : '<span class="badge badge-secondary text-xs" style="font-size:0.6rem">Akses Terbatas</span>'}
            </div>
            <div class="text-xs text-secondary" style="line-height:1.5">
              ${escHtml(roleTip)}
            </div>
          </div>

          <!-- Contoh Kasus Nyata (Scenario Section) -->
          <div class="p-2.5 mb-3" style="background:rgba(16,185,129,0.05);border-radius:6px;border:1px solid rgba(16,185,129,0.15)">
            <div class="font-bold text-xs text-success mb-1 flex items-center gap-1">
              <span>💡</span>
              <span>Contoh Kasus Nyata:</span>
            </div>
            <div class="text-xs text-secondary" style="line-height:1.5">
              ${escHtml(f.scenario)}
            </div>
          </div>

          <!-- Capabilities List -->
          <div class="p-2.5 mb-3" style="background:var(--bg-input);border-radius:6px;border:1px solid var(--border-primary)">
            <div class="font-bold text-xs text-primary mb-1.5" style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px">Fitur & Kemampuan Utama:</div>
            <ul class="text-xs text-secondary mb-0" style="padding-left:1.2rem;line-height:1.6;list-style-type:disc">
              ${f.capabilities.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </div>
        </div>

        <!-- Action Button -->
        <div class="pt-2 flex items-center justify-between" style="border-top:1px solid var(--border-primary)">
          <span class="text-xs text-muted" style="font-size:0.7rem">Akses: <b>${f.roles.map(r => r.toUpperCase()).join(' • ')}</b></span>
          ${isAccessible ? `
            <button class="btn btn-primary btn-xs flex items-center gap-1" onclick="navigateTo('${f.targetPage}')">
              <span>Buka Modul Fitur</span>
              <span>→</span>
            </button>
          ` : `
            <button class="btn btn-secondary btn-xs" disabled title="Fitur ini diperuntukkan bagi peran teknis (${f.roles.join(', ')})">
              <span>Akses Khusus ${f.roles[0].toUpperCase()}</span>
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
};

window.filterGuideRole = function(role, btnEl) {
  document.querySelectorAll('.guide-cat-btn').forEach(b => {
    b.classList.remove('btn-primary');
    b.classList.add('btn-secondary');
  });
  if (btnEl) {
    btnEl.classList.remove('btn-secondary');
    btnEl.classList.add('btn-primary');
  }

  const filtered = window.featuresData.filter(f => f.roles.includes(role.toLowerCase()));
  renderGuideCards(filtered);
};

window.filterGuideCategory = function(cat, btnEl) {
  document.querySelectorAll('.guide-cat-btn').forEach(b => {
    b.classList.remove('btn-primary');
    b.classList.add('btn-secondary');
  });
  if (btnEl) {
    btnEl.classList.remove('btn-secondary');
    btnEl.classList.add('btn-primary');
  }

  const searchVal = document.getElementById('guide-search-input')?.value.toLowerCase().trim() || '';
  let filtered = window.featuresData;
  if (cat !== 'all') {
    filtered = filtered.filter(f => f.category === cat);
  }
  if (searchVal) {
    filtered = filtered.filter(f => 
      f.title.toLowerCase().includes(searchVal) || 
      f.summary.toLowerCase().includes(searchVal) || 
      f.purpose.toLowerCase().includes(searchVal) ||
      f.scenario.toLowerCase().includes(searchVal) ||
      f.capabilities.some(c => c.toLowerCase().includes(searchVal))
    );
  }
  renderGuideCards(filtered);
};

window.filterGuideFeatures = function() {
  const searchVal = document.getElementById('guide-search-input')?.value.toLowerCase().trim() || '';
  const activeCatBtn = document.querySelector('.guide-cat-btn.btn-primary');
  const cat = activeCatBtn ? activeCatBtn.dataset.category : 'all';

  let filtered = window.featuresData;
  if (cat && cat !== 'all') {
    if (cat === 'myrole') {
      const currentRole = (appState.user && appState.user.role) ? appState.user.role.toLowerCase() : 'user';
      filtered = filtered.filter(f => f.roles.includes(currentRole));
    } else {
      filtered = filtered.filter(f => f.category === cat);
    }
  }
  if (searchVal) {
    filtered = filtered.filter(f => 
      f.title.toLowerCase().includes(searchVal) || 
      f.summary.toLowerCase().includes(searchVal) || 
      f.purpose.toLowerCase().includes(searchVal) || 
      f.scenario.toLowerCase().includes(searchVal) ||
      f.categoryName.toLowerCase().includes(searchVal) ||
      f.capabilities.some(c => c.toLowerCase().includes(searchVal))
    );
  }
  renderGuideCards(filtered);
};
