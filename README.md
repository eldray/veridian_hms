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
- 💾 Offline-first architecture with Dexie
- 🎨 Modern UI with Tailwind CSS
- 🌍 Multi-language support (i18n)
- ☁️ Cloudinary integration for image storage

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
- **Dexie** - IndexedDB wrapper for offline support
- **i18next** - Internationalization

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
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd medicare-hms
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
cp .env.example .env  # If example exists, otherwise create .env
```

### 4. Environment Configuration

Create a `.env` file in the `backend` directory:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hmis_db?schema=public"
ENABLE_SEEDING=true
NODE_ENV=development
JWT_SECRET=your-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 5. Database Migration
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

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
# Build frontend
npm run build

# Build backend
cd backend
npm run build

# Start production server
npm start
```

### Electron Desktop App
```bash
cd frontend
npm run dev  # Development
npm run electron:build  # Build distributable
```

## 📖 Available Scripts

### Root Level
| Command | Description |
|---------|-------------|
| `npm start` | Run both client and server concurrently |
| `npm run client` | Start frontend development server |
| `npm run server` | Start backend development server |
| `npm run build` | Build frontend for production |
| `npm run dev` | Vite development mode |
| `npm run preview` | Preview production build |

### Backend (`/backend`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run start` | Start production server |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run build:watch` | Watch mode for TypeScript compilation |
| `npm run seed` | Seed database with test data |
| `npm run gen:types` | Generate frontend TypeScript types |
| `npm run gen:meds` | Update medication database |
| `npm run gen:nhis` | Parse NHIS medicines list |

### Frontend (`/frontend`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Electron app in development mode |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |
| `npm run electron:build` | Build Electron distributable |

## 🗂️ Project Structure

```
medicare-hms/
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
**Last Updated**: May 2025
