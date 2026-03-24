# Admin Dashboard

> Internal admin panel for managing branches, users, documents, price checks, LPP/HPP systems, and more.

![PHP](https://img.shields.io/badge/PHP-8.2-777BB4?logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)

## Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Overview statistics and activity log |
| **User Management** | CRUD users with roles and branch assignment |
| **Branch Management** | Manage company branches |
| **LPP System** | Laporan Penjualan & Piutang dashboard |
| **HPP Calculator** | Harga Pokok Penjualan calculations |
| **Price Check** | Upload & validate pricing data from Excel |
| **Monitoring** | Track delivery and operational data |
| **Documents** | Faktur templates, packing lists, tanda terima, kwitansi |
| **SJ Link Generator** | Generate Surat Jalan tracking links |
| **Text Tool** | Text processing utilities |

## Tech Stack

- **Backend**: PHP 8.2 (vanilla, no framework)
- **Database**: MySQL 8.0 via PDO
- **Frontend**: Vanilla JavaScript SPA + CSS
- **Libraries**: Chart.js, SheetJS (xlsx), PDF.js
- **Fonts**: Inter (Google Fonts)
- **Icons**: Font Awesome 6
- **Infrastructure**: Docker + Docker Compose

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- A shared Docker network for the database:
  ```bash
  docker network create shared_net
  ```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/admin-dashboard.git
   cd admin-dashboard
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your database password:
   ```env
   DB_PASS=your_secure_password
   ```

3. **Start the application**
   ```bash
   docker compose up -d
   ```

4. **Access the app**
   Open [http://localhost:8081](http://localhost:8081)

5. **Default login**
   ```
   Username: admin
   Password: admin123
   ```
   > ⚠️ **Change the default password after first login!**

## Project Structure

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
│       ├── page-auth.js    # Login page
│       ├── page-dashboard.js
│       └── ...
├── storage/                # User uploads (gitignored)
├── .env.example            # Environment template
├── .htaccess               # Apache security rules
├── Dockerfile              # PHP 8.2 Apache image
├── docker-compose.yml      # Docker services config
├── index.html              # SPA entry point
└── index.php               # Redirect to SPA
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `db` | Database hostname |
| `DB_NAME` | `admin_dashboard` | Database name |
| `DB_USER` | `root` | Database username |
| `DB_PASS` | — | Database password |
| `DB_CHARSET` | `utf8mb4` | Database charset |
| `LPP_DB_NAME` | `lpp_system` | LPP external database name |
| `APP_NAME` | `AdminPanel` | Application display name |
| `APP_VERSION` | `1.0.0` | Application version |
| `SESSION_LIFETIME` | `3600` | Session timeout (seconds) |

## Security

- Passwords hashed with `password_hash()` (bcrypt)
- PDO prepared statements (no SQL injection)
- Apache `.htaccess` blocks direct access to `/app` and `/database`
- Database credentials stored in `.env` (never committed)
- Session-based authentication with configurable lifetime

## License

This project is proprietary. All rights reserved.
