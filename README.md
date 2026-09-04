# IT Lease Hub

An enterprise IT inventory, employee loan tracking, and equipment lease cost management system.

IT Lease Hub centralizes hardware lifecycle management for IT and Accounting departments. It enables organizations to manage computer assets, handle multi-branch equipment transfers, log employee loans and returns with condition checks, monitor leasing contracts, detect invoice discrepancies, and generate financial reports.

---

## Features

### 1. Role-Based Access Control (RBAC)
Dedicated permissions and tailored dashboards for three system roles:
- **IT Administrator**: Full system access, hardware CRUD, audit log management, user access control.
- **IT Worker**: Manage device technical specifications, issue loans, process returns, initiate inter-office transfers. Financial data editing is restricted.
- **Accountant**: Manage lease contracts, actual vs. expected monthly installments, equipment values, and financial reconciliation. Technical specs and loan assignments are read-only.

### 2. Hardware Asset Management
- Comprehensive inventory tracking for laptops and workstations.
- Real-time filtering by device type, operational status, and office location (e.g., Warsaw HQ, Cracow R&D).
- Instant full-text search across brands, models, serial numbers, and asset tags.
- Detailed technical specifications (CPU, RAM, storage, notes).
- PDF inventory report export.

### 3. Equipment Loans & Returns
- Assign hardware to employees with department and contact tracking.
- Due date tracking and active loan monitoring.
- Return workflow with hardware condition assessment (`good` vs. `damaged`) and automatic maintenance notes.
- Complete device loan history and centralized audit log.

### 4. Lease Management & Financial Reconciliation
- **Reconciliation Table**: Compares contractually expected lease rates against actual billed invoices to surface cost discrepancies.
- **Contract Expiration Watchlist**: Flags leases terminating within the next 6 months.
- **Lease Calculator / TCO Simulator**: Calculates monthly rates, buyout options, and Total Cost of Ownership (TCO) with PDF simulation export.

### 5. Multi-Office Logistics
- Inter-office transfer workflow (e.g., Warsaw <-> Cracow).
- Transition state tracking (`in_transit`) with two-step delivery confirmation and condition intake logging.
- Enforcement of business rules (e.g., equipment retirement handled through designated leasing hubs).

### 6. Authentication & Security
- Secure session handling using JSON Web Tokens (JWT).
- Password hashing with bcrypt.
- Password recovery via time-limited 6-digit email OTP (One-Time Password) with console fallback in development mode.
- In-app password change for authenticated users.

---

## Tech Stack

- **Backend**: Node.js, Express.js, JWT (`jsonwebtoken`), bcryptjs, Nodemailer
- **Database**: MongoDB via Mongoose with **automatic zero-config fallback to local file storage (`db.json`)** when MongoDB is not connected
- **Frontend**: Vanilla JavaScript (ES6+), CSS3 (Modern Glassmorphic Dark UI), HTML5
- **Libraries**: Chart.js (analytics), jsPDF (PDF export)

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- *(Optional)* [MongoDB](https://www.mongodb.com/) (if not installed or running, the system will automatically operate using the built-in local JSON file database)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/it-lease-hub.git
   cd it-lease-hub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to customize the port, database URI, JWT secret, or SMTP configuration.

4. *(Optional)* Seed demo data or start with a clean database:
   ```bash
   # Populate with realistic demo data (7 devices, leasing contracts, loans, users)
   npm run seed

   # Or reset to an empty database (retains only the admin account)
   npm run seed:clean
   ```

5. Start the application:
   ```bash
   npm run dev
   # or npm start
   ```

6. Access the web interface:
   Open your browser and navigate to `http://localhost:3000`.

---

## Default Accounts

When seeded with `npm run seed`, the system includes pre-configured test accounts for evaluation:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **IT Administrator** | `admin@firma.pl` | `admin123` | Full administrative control |
| **IT Worker** | `it@firma.pl` | `it123456` | Hardware, loans, and transfers |
| **Accountant** | `ksiegowosc@firma.pl` | `ksieg123` | Lease contracts and cost reconciliation |

When running with an empty database (`npm run seed:clean` or fresh install), the system ensures the primary **IT Administrator** account (`admin@firma.pl` / `admin123`) is ready for first login so you can add your own devices from scratch.

---

## Database Commands

| Command | Description |
|---|---|
| `npm run seed` | Resets and populates the database with full demo data (devices, loans, leasing info, 3 user roles). |
| `npm run seed:clean` | Wipes all devices, loans, and activities, leaving only the clean administrator account. |

---

## Environment Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port for the HTTP server |
| `MONGO_URI` | `mongodb://localhost:27017/it-lease` | MongoDB connection URI |
| `JWT_SECRET` | `it-lease-hub-super-secret-key-2026` | Secret key for signing session tokens |
| `SMTP_HOST` | *(Optional)* | SMTP server host for sending password reset emails |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_SECURE` | `false` | Enable TLS (`true` for port 465) |
| `SMTP_USER` | *(Optional)* | SMTP authentication username |
| `SMTP_PASS` | *(Optional)* | SMTP authentication password |
| `SMTP_FROM` | `no-reply@firma.pl` | Sender address for outgoing emails |

> **Development Note**: When SMTP credentials are not provided, password reset OTP codes are output directly to the server console and logged to `last_sent_email.txt` for testing.

---

## API Summary

### Authentication
- `POST /api/auth/register` — Register a new user account
- `POST /api/auth/login` — Authenticate and receive a JWT token
- `GET /api/auth/me` — Retrieve current session profile
- `POST /api/auth/change-password` — Change password for authenticated user
- `POST /api/auth/forgot-password/request` — Request 6-digit OTP reset code
- `POST /api/auth/forgot-password/reset` — Verify OTP and set new password

### Devices & Inventory
- `GET /api/devices` — List devices with filtering (`type`, `status`, `location`, `search`)
- `GET /api/devices/:id` — Get device details
- `POST /api/devices` — Create a new device *(IT/Admin)*
- `PUT /api/devices/:id` — Update device specs or financial details *(Role-filtered)*
- `DELETE /api/devices/:id` — Remove device *(Admin only)*
- `POST /api/devices/:id/transfer` — Initiate inter-office transfer *(IT/Admin)*
- `POST /api/devices/:id/confirm-transfer` — Confirm delivery and inspect condition *(IT/Admin)*

### Loans & History
- `POST /api/devices/:id/loan` — Issue loan to employee *(IT/Admin)*
- `POST /api/devices/:id/return` — Process return and log condition *(IT/Admin)*
- `GET /api/loans/active` — List currently active loans
- `GET /api/history` — List full loan history
- `DELETE /api/history/:id` — Delete a single history record *(Admin only)*
- `DELETE /api/history/completed` — Clear all returned loan records *(Admin only)*

### Metrics & Activities
- `GET /api/stats` — High-level dashboard counters and distribution
- `GET /api/activities` — Filterable audit trail of system events
- `DELETE /api/activities` — Clear activity logs *(Admin only)*

---

## Project Structure

```text
├── models/
│   ├── Activity.js       # Audit log schema
│   ├── Device.js         # Hardware asset & leasing schema
│   ├── Loan.js           # Loan record schema
│   └── User.js           # User credentials & role schema
├── public/
│   ├── app.js            # Client-side state management & API client
│   ├── index.html        # Single-page application markup & modals
│   └── styles.css        # Responsive dark-theme design system
├── .env.example          # Sample environment configuration
├── .gitignore            # Git exclusion rules
├── db.js                 # Dual-mode database layer (MongoDB & JSON fallback)
├── mailer.js             # Email transport & local dev simulation
├── package.json          # Node.js dependencies & scripts
├── README.md             # Project documentation
└── server.js             # Express application & REST endpoints
```

---

## License

This project is licensed under the MIT License.
