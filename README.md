# Medicare Hospital Management System (HMIS)

A comprehensive Hospital Management System built with React, Electron, Node.js, Express, and PostgreSQL. This system provides complete hospital operations management including patient care, maternity services, pharmacy, billing, and more.

## 🏥 Features

### Core Modules
- **Patient Management** - Registration, demographics, insurance details
- **Antenatal Care** - ANC bookings, visits, risk assessment
- **Labour & Delivery** - Delivery records, newborn information
- **Postnatal Care** - Follow-up visits, maternal and baby assessment
- **Pharmacy** - Medication dispensing, inventory management
- **Billing & Insurance** - NHIS integration, private insurance, cash payments
- **Bed Management** - Ward allocation, bed assignment
- **Laboratory** - Test orders and results
- **Reports** - Comprehensive hospital analytics

### Technical Features
- 🔄 Real-time data synchronization
- 📱 Desktop application with Electron
- 🌐 RESTful API backend
- 🔐 Secure authentication with JWT
- 📊 Interactive charts and dashboards
- 📄 PDF report generation
- 🎨 Modern UI with Tailwind CSS
- ☁️ Cloudinary integration for image storage

> The UI is English-only today. `i18next` and Dexie are installed but are not
> wired into the application; there is no offline mode yet.

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Electron** - Desktop application
- **React Router** - Navigation
- **Zustand** - State management
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Tailwind CSS** - Styling
- **Chart.js & Recharts** - Data visualization
- **Axios** - HTTP client
- **i18next** - Installed for future localization (not active)

### Backend
- **Node.js** - Runtime environment
- **Express 5** - Web framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File uploads
- **Cloudinary** - Cloud storage
- **PDFKit & jsPDF** - PDF generation
- **node-cron** - Scheduled tasks
- **Helmet** - Security headers
- **Morgan** - HTTP request logging

## 📦 Installation

### Prerequisites
- Node.js 22 LTS (see `.nvmrc`)
- PostgreSQL (v14 or higher)
- npm (the root, backend, and frontend each have their own lockfile)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd veridian_hms
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Database Setup
```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE hmis_db;
\q

# Configure environment variables
cd backend
cp .env.example .env
```

### 4. Environment Configuration

Create a `.env` file in the `backend` directory:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hmis_db?schema=public"
ENABLE_SEEDING=true
NODE_ENV=development
# Must be at least 32 characters; generate a unique random value for each environment.
JWT_SECRET=replace-with-a-unique-random-secret-at-least-32-characters
```

### 5. Database Setup

**Important:** the checked-in Prisma migrations are incremental and are not a complete baseline for a brand-new database.

For a new development database, sync the schema and generate the Prisma client:

```bash
cd backend
npx prisma db push
npx prisma generate
```

For an existing hospital database, take a verified backup and review its current schema before applying changes. If it already contains stock records, follow [the departmental stock ledger rollout guide](backend/docs/DEPARTMENTAL_STOCK_LEDGER.md) and run its backfill only after the schema is updated. Do not run `prisma migrate deploy` against a database created with `db push` until the migration baseline has been reconciled.

### 6. Seed Database (Optional)
```bash
# Full database seed
npm run seed

# Or maternity-specific seed
npx tsx src/seed/seedMaternityData.ts
```

## 🚀 Running the Application

### Development Mode

**Option 1: Run Both Concurrently (Recommended)**
```bash
# From root directory
npm start
```

**Option 2: Run Separately**
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

### Production Build
```bash
# Build backend and frontend
npm --prefix backend run build
npm --prefix frontend run build

# Start the compiled API (serves the UI when FRONTEND_DIST points at frontend/dist)
npm run server:public
```

For upgrades, backups, health checks, and supported topologies, read
[docs/OPERATIONS.md](docs/OPERATIONS.md).

### Electron Desktop App
```bash
npm run build:win       # installer -> release/
npm run build:win:dir   # unpacked app for a quick check
```

## 📖 Available Scripts

### Root Level
| Command | Description |
|---------|-------------|
| `npm start` | Run frontend, backend, and Electron together |
| `npm run client` | Start frontend development server |
| `npm run server` | Start backend development server |
| `npm run server:public` | Build and start the compiled backend |
| `npm run build:win` | Build the Windows installer |
| `npm test` | Run backend tests |
| `npm run typecheck` | Type-check backend and frontend |
| `npm run lint` | Run frontend ESLint |
| `npm run secret-scan` | Scan for committed secrets with gitleaks |

### Backend (`/backend`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run start` | Start server from TypeScript sources |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run the Vitest suite |
| `npm run seed` | Seed database with test data |
| `npm run gen:types` | Generate frontend TypeScript types |
| `npm run gen:meds` | Update medication database |
| `npm run gen:nhis` | Parse NHIS medicines list |

### Frontend (`/frontend`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Build for production |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## 🗂️ Project Structure

```
veridian_hms/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Request handlers
│   │   ├── cron/            # Scheduled jobs
│   │   ├── data/            # Static data files
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── scripts/         # Utility scripts
│   │   ├── seed/            # Database seeding
│   │   ├── services/        # Business logic
│   │   ├── types/           # TypeScript types
│   │   └── server.ts        # Entry point
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── uploads/             # File uploads
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── assets/          # Static assets
│   │   ├── components/      # Reusable components
│   │   ├── data/            # Static data
│   │   ├── layouts/         # Page layouts
│   │   ├── pages/           # Page components
│   │   ├── store/           # State management
│   │   ├── styles/          # CSS files
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utility functions
│   ├── public/              # Public assets
│   ├── main.js              # Electron main process
│   ├── preload.js           # Electron preload script
│   └── package.json
├── package.json
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Patients
- `GET /api/patients` - List all patients
- `GET /api/patients/:id` - Get patient details
- `POST /api/patients` - Create patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Antenatal Care
- `GET /api/antenatal/bookings` - List ANC bookings
- `GET /api/antenatal/booking/:id` - Get booking details
- `POST /api/antenatal/bookings` - Create booking
- `GET /api/antenatal/visits/:bookingId` - Get ANC visits
- `POST /api/antenatal/visits` - Record ANC visit

### Delivery
- `GET /api/delivery/records` - List delivery records
- `GET /api/delivery/records?patientId=:id` - Get patient deliveries
- `POST /api/delivery/records` - Create delivery record

### Postnatal Care
- `GET /api/postnatal/visits` - List postnatal visits
- `GET /api/postnatal/visits?patientId=:id` - Get patient visits
- `POST /api/postnatal/visits` - Record postnatal visit

### Pharmacy
- `GET /api/pharmacy/medications` - List medications
- `POST /api/pharmacy/dispense` - Dispense medication
- `GET /api/pharmacy/inventory` - View inventory

### Billing
- `GET /api/billing/invoices` - List invoices
- `POST /api/billing/invoices` - Create invoice
- `POST /api/billing/payments` - Record payment

*For complete API documentation, see [API Documentation](./backend/docs/API.md)*

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📝 Database Seeding

The system includes comprehensive seed data for testing:

### Maternity Test Data
Five test patients with complete maternity records:
- **MAT-TEST-001**: Primigravida - Delivered
- **MAT-TEST-002**: Multigravida - Currently Pregnant
- **MAT-TEST-003**: High Risk Pregnancy - Delivered
- **MAT-TEST-004**: Cesarean Section
- **MAT-TEST-005**: Twins Delivery

See [Maternity Seed Guide](./MATERNITY_SEED_README.md) for details.

## 🔒 Security

- JWT-based authentication
- Password hashing with bcryptjs
- Helmet security headers
- CORS configuration
- Input validation with express-validator
- SQL injection prevention via Prisma ORM
- XSS protection

## 📊 Monitoring & Logging

- Morgan HTTP request logging
- Cron jobs for scheduled tasks
- Error tracking and handling
- Database backup scripts in `/backend/backups`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

ISC License

## 👥 Authors

- **Emmanuel Appiah** - *Frontend* - [emk.appiah@gmail.com]
- **Medicare HMS Team**

## 🙏 Acknowledgments

- NHIS Ghana for medication guidelines
- All contributors and testers

## 📞 Support

For support, email support@medicarehms.com or open an issue in the repository.

---

**Version**: 1.0.0  
**Last Updated**: October 2026
