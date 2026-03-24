# 🗂️ Admin Dashboard — Internal Operations Panel

> Internal admin panel untuk manajemen cabang, user, dokumen operasional,
> analisis inventory (LPP/HPP), dan monitoring kwitansi.

![PHP](https://img.shields.io/badge/PHP-8.2-777BB4?logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-red)

## 📸 Screenshots

<!-- Tambahkan screenshot di sini -->
| Dashboard | LPP Analytics | Price Check |
|-----------|--------------|-------------|
| *coming soon* | *coming soon* | *coming soon* |

## ✨ Features

| Module | Description |
|--------|-------------|
| 📊 **Dashboard** | Overview statistics, activity log, and quick actions |
| 👥 **User Management** | CRUD users with role-based access and branch assignment |
| 🏢 **Branch Management** | Manage company branches with status tracking |
| 📈 **LPP System** | Laporan Penjualan & Piutang — analytics, comparison, smart data explorer |
| 🧮 **HPP Calculator** | Harga Pokok Penjualan simulation and calculations |
| ✅ **Price Check** | Upload & validate pricing data from Excel files |
| 📡 **Monitoring** | Track delivery and operational data in real-time |
| 📄 **Documents** | Faktur templates, packing lists, tanda terima, kwitansi |
| 🔗 **SJ Link Generator** | Generate Surat Jalan tracking links in batch |
| 🔤 **Text Tool** | Text processing and formatting utilities |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | PHP 8.2 (vanilla, no framework) |
| **Database** | MySQL 8.0 via PDO |
| **Frontend** | Vanilla JavaScript SPA + CSS |
| **Charts** | Chart.js 4.x |
| **Spreadsheet** | SheetJS (xlsx) |
| **PDF** | PDF.js 3.x |
| **Typography** | Inter (Google Fonts) |
| **Icons** | Font Awesome 6 |
| **Infrastructure** | Docker + Docker Compose |

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- A shared Docker network:
  ```bash
  docker network create shared_net
  ```

### Installation

```bash
# 1. Clone
git clone https://github.com/your-username/admin-dashboard.git
cd admin-dashboard

# 2. Configure environment
cp .env.example .env
# Edit .env → set DB_PASS and other values

# 3. Start
docker compose up -d

# 4. Open
open http://localhost:8081
```

### Default Login

```
Username: admin
Password: (set saat pertama kali setup — lihat CHANGE_THIS_PASSWORD di Database.php)
```

> ⚠️ **Wajib ganti password setelah install pertama!**

## 📁 Project Structure

```
admin-dashboard/
├── api/                    # REST API endpoints
│   ├── auth.php            # Authentication
│   ├── branches.php        # Branch CRUD
│   ├── dashboard.php       # Dashboard stats
│   ├── hpp.php             # HPP calculator
│   ├── lpp.php             # LPP system
│   ├── monitoring.php      # Monitoring data
│   ├── price-check.php     # Price validation
│   ├── users.php           # User management
│   └── ...
├── app/
│   ├── config/
│   │   └── database.php    # DB config (reads from .env)
│   └── models/             # Data models & DB layer
├── database/
│   ├── schema.sql          # SQLite schema (legacy)
│   └── schema_mysql.sql    # MySQL schema
├── public/
│   ├── css/style.css       # Application styles
│   └── js/                 # SPA JavaScript modules
│       ├── app.js          # Main app + router
│       └── page-*.js       # Page modules
├── storage/                # User uploads (gitignored)
├── .env.example            # Environment template
├── .htaccess               # Apache security rules
├── Dockerfile              # PHP 8.2 Apache image
├── docker-compose.yml      # Docker services config
└── index.html              # SPA entry point
```

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `db` | Database hostname |
| `DB_NAME` | `admin_dashboard` | Database name |
| `DB_USER` | `root` | Database username |
| `DB_PASS` | — | Database password |
| `DB_CHARSET` | `utf8mb4` | Database charset |
| `LPP_DB_NAME` | `lpp_system` | LPP external database name |
| `LPP_SCRIPT_PATH` | — | Path to LPP upload processor script |
| `APP_NAME` | `AdminPanel` | Application display name |
| `APP_VERSION` | `1.0.0` | Application version |
| `APP_ENV` | — | Set to `development` for seed data |
| `SESSION_LIFETIME` | `3600` | Session timeout (seconds) |

## 🔒 Security

- ✅ Passwords hashed with `password_hash()` (bcrypt)
- ✅ PDO prepared statements — no SQL injection
- ✅ Apache `.htaccess` blocks direct access to `/app` and `/database`
- ✅ Credentials stored in `.env` — never committed to Git
- ✅ `shell_exec` calls use `escapeshellcmd()` + `escapeshellarg()`
- ✅ Upload temp files in `sys_get_temp_dir()` with restricted permissions
- ✅ Dummy seed data only loads when `APP_ENV=development`

## 📝 License

This project is proprietary. All rights reserved.
