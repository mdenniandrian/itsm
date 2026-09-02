/**
 * Database Seeder - Populates demo data for ITSM
 * Run: node utils/seed.js
 */
const db = require('../database/db');
const bcrypt = require('bcryptjs');

console.log('🌱 Seeding database...');

// Clear existing data (except schema)
db.exec(`
  DELETE FROM ticket_history;
  DELETE FROM ticket_comments;
  DELETE FROM notifications;
  DELETE FROM tickets;
  DELETE FROM assets;
  DELETE FROM knowledge_articles;
  DELETE FROM sla_policies;
  DELETE FROM users;
`);

// Seed Users
const users = [
  { email: 'admin@itsm.com', password: 'admin123', name: 'Ahmad Wijaya', role: 'admin', department: 'IT' },
  { email: 'manager@itsm.com', password: 'manager123', name: 'Siti Rahayu', role: 'manager', department: 'IT' },
  { email: 'agent1@itsm.com', password: 'agent123', name: 'Budi Santoso', role: 'agent', department: 'IT Support' },
  { email: 'agent2@itsm.com', password: 'agent123', name: 'Dewi Lestari', role: 'agent', department: 'IT Support' },
  { email: 'agent@itsm.com', password: 'agent123', name: 'Rizki Firmansyah', role: 'agent', department: 'Network' },
  { email: 'user@itsm.com', password: 'user123', name: 'Eko Prasetyo', role: 'user', department: 'Finance' },
  { email: 'user2@itsm.com', password: 'user123', name: 'Fitri Handayani', role: 'user', department: 'HR' },
  { email: 'user3@itsm.com', password: 'user123', name: 'Gunawan Setiawan', role: 'user', department: 'Marketing' },
  { email: 'user4@itsm.com', password: 'user123', name: 'Heni Kusuma', role: 'user', department: 'Operations' },
  { email: 'user5@itsm.com', password: 'user123', name: 'Indra Cahyono', role: 'user', department: 'Sales' },
];

const insertUser = db.prepare(
  'INSERT INTO users (email, password_hash, name, role, department) VALUES (?, ?, ?, ?, ?)'
);
const userIds = {};
for (const u of users) {
  const result = insertUser.run(u.email, bcrypt.hashSync(u.password, 10), u.name, u.role, u.department);
  userIds[u.email] = result.lastInsertRowid;
}
console.log(`✅ Created ${users.length} users`);

// Seed SLA Policies
const slaInsert = db.prepare('INSERT INTO sla_policies (name, priority, response_time_hrs, resolution_time_hrs) VALUES (?, ?, ?, ?)');
const slaCritical = slaInsert.run('Critical SLA', 'critical', 1, 4);
const slaHigh = slaInsert.run('High Priority SLA', 'high', 4, 8);
const slaMedium = slaInsert.run('Standard SLA', 'medium', 8, 24);
const slaLow = slaInsert.run('Low Priority SLA', 'low', 24, 72);
console.log('✅ Created SLA policies');

const slaMap = {
  critical: slaCritical.lastInsertRowid,
  high: slaHigh.lastInsertRowid,
  medium: slaMedium.lastInsertRowid,
  low: slaLow.lastInsertRowid,
};

// Seed Tickets
const priorities = ['critical', 'high', 'medium', 'low'];
const statuses = ['open', 'in_progress', 'pending', 'resolved', 'closed'];
const categories = ['incident', 'service_request', 'problem', 'change_request'];
const agents = [userIds['agent1@itsm.com'], userIds['agent2@itsm.com'], userIds['agent@itsm.com'], userIds['admin@itsm.com']];
const requesters = [userIds['user@itsm.com'], userIds['user2@itsm.com'], userIds['user3@itsm.com'], userIds['user4@itsm.com'], userIds['user5@itsm.com']];

const ticketTemplates = [
  { title: 'Laptop tidak bisa booting setelah update Windows', priority: 'high', category: 'incident' },
  { title: 'Email tidak bisa terkirim ke domain external', priority: 'critical', category: 'incident' },
  { title: 'Request akses VPN untuk kerja remote', priority: 'medium', category: 'service_request' },
  { title: 'Printer di lantai 3 tidak bisa print', priority: 'low', category: 'incident' },
  { title: 'Software Autocad perlu diinstall di workstation baru', priority: 'medium', category: 'service_request' },
  { title: 'Server database sangat lambat sejak kemarin', priority: 'critical', category: 'problem' },
  { title: 'Request penggantian mouse dan keyboard yang rusak', priority: 'low', category: 'service_request' },
  { title: 'Upgrade RAM laptop Tim Finance', priority: 'medium', category: 'change_request' },
  { title: 'Website company tidak bisa diakses dari luar kantor', priority: 'high', category: 'incident' },
  { title: 'Backup server gagal sejak 3 hari lalu', priority: 'critical', category: 'problem' },
  { title: 'Request pembuatan akun Office 365 untuk karyawan baru', priority: 'low', category: 'service_request' },
  { title: 'WiFi di ruang meeting tidak stabil', priority: 'high', category: 'incident' },
  { title: 'Perlu reset password Active Directory', priority: 'medium', category: 'service_request' },
  { title: 'Antivirus expired di beberapa workstation', priority: 'high', category: 'problem' },
  { title: 'Switch jaringan lantai 2 perlu diganti', priority: 'medium', category: 'change_request' },
  { title: 'Data tidak tersync antara laptop dan server', priority: 'high', category: 'incident' },
  { title: 'Request software desain grafis untuk Tim Marketing', priority: 'medium', category: 'service_request' },
  { title: 'UPS di server room perlu maintenance', priority: 'medium', category: 'change_request' },
  { title: 'Koneksi internet sangat lambat di pagi hari', priority: 'high', category: 'problem' },
  { title: 'Monitor di workstation HR bergaris', priority: 'low', category: 'incident' },
  { title: 'Request enkripsi laptop untuk Tim Finance', priority: 'high', category: 'service_request' },
  { title: 'Firewall perlu dikonfigurasi untuk aplikasi baru', priority: 'medium', category: 'change_request' },
  { title: 'ERP sistem error saat proses payroll', priority: 'critical', category: 'incident' },
  { title: 'Sharing folder tidak bisa diakses dari divisi lain', priority: 'high', category: 'incident' },
  { title: 'Request konfigurasi dual monitor', priority: 'low', category: 'service_request' },
];

const insertTicket = db.prepare(`
  INSERT INTO tickets (ticket_number, title, description, status, priority, category, requester_id, assignee_id, sla_policy_id, sla_response_due, sla_resolution_due, sla_resolution_breached, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function genTicketNum(idx) {
  return `TKT-2408-${String(idx + 1).padStart(5, '0')}`;
}

const descriptions = [
  'Laptop karyawan tidak dapat booting setelah melakukan update Windows. Layar hitam setelah logo Windows. Sudah dicoba restart beberapa kali namun tetap sama.',
  'Email tidak dapat dikirim ke alamat diluar domain perusahaan. Error "550 relay not permitted". Sudah terjadi sejak tadi pagi dan berdampak pada seluruh pengguna.',
  'Karyawan membutuhkan akses VPN untuk dapat bekerja dari rumah. Sudah ada persetujuan dari manager langsung.',
  'Printer HP LaserJet di lantai 3 tidak merespon ketika diberikan perintah print. Sudah dicoba restart printer namun belum berhasil.',
  'Workstation baru Tim Design memerlukan instalasi Autocad 2024. License sudah tersedia di shared folder IT.',
  'Database server mengalami perlambatan signifikan. Query yang biasanya selesai dalam 2 detik kini membutuhkan lebih dari 2 menit. Berpengaruh pada semua aplikasi yang terhubung.',
  'Mouse dan keyboard di workstation no.25 sudah tidak berfungsi dengan baik. Mouse click tidak responsif dan beberapa tombol keyboard macet.',
  'Tim Finance memerlukan upgrade RAM dari 8GB ke 16GB untuk dapat menjalankan software analisis data dengan lancar.',
  'Website perusahaan tidak dapat diakses dari IP publik. Pengguna internal masih bisa akses, namun klien dari luar tidak bisa.',
  'Proses backup harian ke server backup gagal sejak 3 hari terakhir. Ada risiko kehilangan data jika tidak segera ditangani.',
];

const now = Date.now();
for (let i = 0; i < ticketTemplates.length; i++) {
  const t = ticketTemplates[i];
  const status = statuses[i % statuses.length];
  const requester = requesters[i % requesters.length];
  const assignee = i % 4 === 3 ? null : agents[i % agents.length];
  const createdAt = new Date(now - (ticketTemplates.length - i) * 3600000 * 8).toISOString();
  const updatedAt = new Date(now - (ticketTemplates.length - i) * 3600000 * 4).toISOString();

  const slaHrs = { critical: 4, high: 8, medium: 24, low: 72 };
  const created = new Date(createdAt);
  const resolutionDue = new Date(created.getTime() + slaHrs[t.priority] * 3600000).toISOString();
  const responseDue = new Date(created.getTime() + (slaHrs[t.priority] / 4) * 3600000).toISOString();
  const isBreached = i % 5 === 0 && status !== 'resolved' && status !== 'closed' ? 1 : 0;

  insertTicket.run(
    genTicketNum(i), t.title,
    descriptions[i % descriptions.length],
    status, t.priority, t.category,
    requester, assignee,
    slaMap[t.priority], responseDue, resolutionDue, isBreached,
    createdAt, updatedAt
  );
}
console.log(`✅ Created ${ticketTemplates.length} tickets`);

// Add some comments
const insertComment = db.prepare('INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal) VALUES (?, ?, ?, ?)');
const tickets = db.prepare('SELECT id, requester_id, assignee_id FROM tickets LIMIT 15').all();

const commentTemplates = [
  ['Sudah dicek, masalahnya pada driver VGA yang corrupt setelah update. Sedang proses reinstall driver.', false],
  ['Update: Driver berhasil diinstall ulang, laptop sudah bisa booting normal. Menunggu konfirmasi dari user.', false],
  ['Terima kasih, laptop sudah normal kembali. Masalah terselesaikan.', false],
  ['Nota internal: Akan escalate ke vendor jika tidak selesai dalam 2 jam.', true],
  ['User sudah dihubungi via telepon. Sedang remote access untuk diagnosa lebih lanjut.', false],
  ['Masalah sudah diidentifikasi. Menunggu approval untuk implementasi solusi.', false],
];

for (let i = 0; i < tickets.length; i++) {
  const t = tickets[i];
  const commentCount = Math.floor(Math.random() * 3) + 1;
  for (let j = 0; j < commentCount; j++) {
    const [content, isInternal] = commentTemplates[(i + j) % commentTemplates.length];
    const commentUserId = j % 2 === 0 ? (t.assignee_id || agents[0]) : t.requester_id;
    insertComment.run(t.id, commentUserId, content, isInternal ? 1 : 0);
  }
}
console.log('✅ Created ticket comments');

// Seed Knowledge Base
const articles = [
  {
    title: 'Cara Reset Password Windows Active Directory',
    content: `# Reset Password Active Directory\n\nPanduan untuk mereset password Active Directory.\n\n## Langkah-langkah\n\n1. Buka **Active Directory Users and Computers**\n2. Cari user yang passwordnya perlu direset\n3. Klik kanan pada user > **Reset Password**\n4. Masukkan password baru yang memenuhi policy\n5. Centang "User must change password at next logon"\n6. Klik OK\n\n## Password Policy\n- Minimal 8 karakter\n- Mengandung huruf besar, huruf kecil, angka\n- Tidak boleh sama dengan 5 password terakhir\n\n## Catatan\nJika user terkunci (locked), centang juga opsi **Unlock account**.`,
    category: 'account',
    tags: ['password', 'active directory', 'reset', 'windows']
  },
  {
    title: 'Troubleshooting Koneksi VPN',
    content: `# Troubleshooting VPN\n\nPanduan mengatasi masalah koneksi VPN.\n\n## Masalah Umum\n\n### 1. Tidak Bisa Connect\n- Pastikan internet aktif\n- Cek username dan password\n- Pastikan VPN client versi terbaru\n- Coba server VPN yang berbeda\n\n### 2. Koneksi Lambat\n- Pilih server yang dekat dengan lokasi Anda\n- Tutup aplikasi lain yang menggunakan bandwidth\n- Restart VPN client\n\n### 3. Disconnect Terus\n- Cek firewall - pastikan port VPN tidak diblokir\n- Disable IPv6 jika masih bermasalah\n- Hubungi IT jika masalah berlanjut\n\n## Kontak Darurat\nHubungi IT Helpdesk: ext. 1234`,
    category: 'network',
    tags: ['vpn', 'network', 'koneksi', 'troubleshooting']
  },
  {
    title: 'Panduan Setup Email di Outlook',
    content: `# Setup Email Outlook\n\nCara konfigurasi email perusahaan di Microsoft Outlook.\n\n## Konfigurasi Server\n\n| Setting | Value |\n|---------|-------|\n| Incoming | mail.perusahaan.com (IMAP, Port 993) |\n| Outgoing | mail.perusahaan.com (SMTP, Port 587) |\n| Encryption | TLS |\n\n## Langkah Setup\n1. Buka Outlook > File > Add Account\n2. Masukkan email perusahaan Anda\n3. Pilih "Advanced Options" > "Let me set up my account manually"\n4. Pilih IMAP\n5. Masukkan server settings di atas\n6. Klik Connect dan masukkan password\n\n## Troubleshooting\nJika gagal, pastikan password benar dan akun belum expired.`,
    category: 'email',
    tags: ['email', 'outlook', 'setup', 'konfigurasi']
  },
  {
    title: 'Prosedur Request Hardware Baru',
    content: `# Request Hardware Baru\n\nProsedur pengajuan permintaan hardware baru.\n\n## Langkah Pengajuan\n1. Buat ticket di ITSM dengan kategori **Service Request**\n2. Sertakan justifikasi kebutuhan hardware\n3. Lampirkan approval dari manager/supervisor\n4. Tunggu review dari tim IT (1-3 hari kerja)\n\n## Spesifikasi Standar\n\n### Laptop Standar\n- CPU: Intel Core i5 gen 12+\n- RAM: 8GB DDR4\n- Storage: 256GB SSD\n- OS: Windows 11 Pro\n\n### Laptop High Performance (Perlu Approval Khusus)\n- CPU: Intel Core i7 gen 12+\n- RAM: 16GB DDR4\n- Storage: 512GB SSD\n\n## SLA Pengiriman\n- Hardware tersedia: 3-5 hari kerja\n- Hardware perlu dipesan: 2-3 minggu`,
    category: 'hardware',
    tags: ['hardware', 'laptop', 'request', 'pengadaan']
  },
  {
    title: 'Backup dan Recovery Data',
    content: `# Panduan Backup & Recovery\n\nKebijakan dan prosedur backup data perusahaan.\n\n## Jadwal Backup\n\n| Tipe | Frekuensi | Retensi |\n|------|-----------|--------|\n| Full Backup | Setiap Minggu (Sabtu 02:00) | 4 minggu |\n| Incremental | Setiap Hari (02:00) | 7 hari |\n| Database | Setiap 6 Jam | 30 hari |\n\n## Cara Request Recovery\n1. Buat ticket dengan kategori **Service Request**\n2. Sebutkan file/folder yang perlu direcovery\n3. Sebutkan tanggal versi yang diinginkan\n4. SLA: 4-8 jam untuk recovery\n\n## Lokasi Backup\n- Primary: \\\\\\\\backup-server\\\\backup\n- Secondary: Cloud Storage (Azure Blob)\n\n## PENTING\nJangan simpan data penting hanya di local drive laptop!`,
    category: 'data',
    tags: ['backup', 'recovery', 'data', 'storage']
  },
];

const insertArticle = db.prepare(`
  INSERT INTO knowledge_articles (title, content, category, tags, author_id, views, helpful_count)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (let i = 0; i < articles.length; i++) {
  const a = articles[i];
  insertArticle.run(a.title, a.content, a.category, JSON.stringify(a.tags), userIds['admin@itsm.com'], Math.floor(Math.random() * 200) + 10, Math.floor(Math.random() * 50));
}
console.log(`✅ Created ${articles.length} knowledge articles`);

// Seed Assets
const assetData = [
  { name: 'Laptop Dell Latitude 5530', type: 'laptop', brand: 'Dell', model: 'Latitude 5530', serial_number: 'DL553001', status: 'active', assigned_to: userIds['user@itsm.com'], location: 'Lantai 3', purchase_value: 15000000 },
  { name: 'Laptop HP EliteBook 840', type: 'laptop', brand: 'HP', model: 'EliteBook 840 G9', serial_number: 'HP840G9002', status: 'active', assigned_to: userIds['user2@itsm.com'], location: 'Lantai 2', purchase_value: 14000000 },
  { name: 'Server Dell PowerEdge R740', type: 'server', brand: 'Dell', model: 'PowerEdge R740', serial_number: 'PE740001', ip_address: '192.168.1.10', status: 'active', assigned_to: null, location: 'Server Room', purchase_value: 85000000 },
  { name: 'Switch Cisco Catalyst 9200', type: 'network', brand: 'Cisco', model: 'Catalyst 9200', serial_number: 'CS9200001', ip_address: '192.168.1.254', status: 'active', assigned_to: null, location: 'Lantai 1 - MDF', purchase_value: 35000000 },
  { name: 'Printer HP LaserJet Pro', type: 'printer', brand: 'HP', model: 'LaserJet Pro M428fdw', serial_number: 'HPLJ428001', status: 'active', assigned_to: null, location: 'Lantai 3', purchase_value: 5000000 },
  { name: 'Laptop Lenovo ThinkPad X1', type: 'laptop', brand: 'Lenovo', model: 'ThinkPad X1 Carbon', serial_number: 'LNX1C001', status: 'maintenance', assigned_to: userIds['user3@itsm.com'], location: 'IT Workshop', purchase_value: 18000000 },
  { name: 'Server HP ProLiant DL380', type: 'server', brand: 'HP', model: 'ProLiant DL380 Gen10', serial_number: 'HPDL380001', ip_address: '192.168.1.11', status: 'active', assigned_to: null, location: 'Server Room', purchase_value: 75000000 },
  { name: 'Desktop HP EliteDesk 800', type: 'desktop', brand: 'HP', model: 'EliteDesk 800 G8', serial_number: 'HPED800001', status: 'active', assigned_to: userIds['user4@itsm.com'], location: 'Lantai 2', purchase_value: 9000000 },
  { name: 'iPhone 13 - Corporate', type: 'mobile', brand: 'Apple', model: 'iPhone 13', serial_number: 'APL13001', status: 'active', assigned_to: userIds['manager@itsm.com'], location: 'Mobile', purchase_value: 12000000 },
  { name: 'Microsoft Office 365 License', type: 'software', brand: 'Microsoft', model: 'Office 365 E3', serial_number: 'MS365E3001', status: 'active', assigned_to: null, location: 'Cloud', purchase_value: 2500000 },
];

const insertAsset = db.prepare(`
  INSERT INTO assets (name, type, brand, model, serial_number, ip_address, status, assigned_to, location, purchase_value)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const a of assetData) {
  insertAsset.run(a.name, a.type, a.brand || null, a.model || null, a.serial_number || null, a.ip_address || null, a.status, a.assigned_to || null, a.location || null, a.purchase_value || null);
}
console.log(`✅ Created ${assetData.length} assets`);

// Seed Notifications
const notifInsert = db.prepare('INSERT INTO notifications (user_id, title, message, type, is_read, ticket_id) VALUES (?, ?, ?, ?, ?, ?)');
const allTickets = db.prepare('SELECT id, ticket_number FROM tickets LIMIT 8').all();

for (let i = 0; i < allTickets.length; i++) {
  const t = allTickets[i];
  notifInsert.run(userIds['admin@itsm.com'], 'New Ticket', `Ticket ${t.ticket_number} telah dibuat`, 'info', i < 3 ? 0 : 1, t.id);
  notifInsert.run(userIds['agent1@itsm.com'], 'Ticket Assigned', `Ticket ${t.ticket_number} ditugaskan kepada Anda`, 'info', i < 2 ? 0 : 1, t.id);
}
console.log('✅ Created notifications');

console.log('\n✨ Database seeding complete!');
console.log('\n📋 Demo Accounts:');
console.log('  admin@itsm.com    / admin123   (Admin)');
console.log('  manager@itsm.com  / manager123 (Manager)');
console.log('  agent@itsm.com    / agent123   (Agent)');
console.log('  user@itsm.com     / user123    (User)');
