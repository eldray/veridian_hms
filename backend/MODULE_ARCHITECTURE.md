# Module Architecture Guide

## Overview

This document describes the enterprise module architecture implemented in the Medicare Hospital Management System.

## Directory Structure

```
backend/src/
├── core/                       # Core infrastructure
│   ├── database/
│   │   ├── prisma.client.ts    # Prisma singleton
│   │   └── index.ts
│   ├── auth/                   # (To be added)
│   ├── cache/                  # (To be added)
│   └── index.ts
│
├── modules/                    # Feature modules (Domain-driven)
│   ├── patient/
│   │   ├── PatientTypes.ts     # DTOs and type definitions
│   │   ├── PatientRepository.ts # Data access layer
│   │   ├── PatientService.ts   # Business logic layer
│   │   ├── PatientController.ts # HTTP request handlers
│   │   ├── PatientRoutes.ts    # Route definitions
│   │   └── index.ts            # Module exports
│   ├── billing/                # (To be added)
│   ├── attendance/             # (To be added)
│   └── index.ts                # Module registration
│
├── shared/                     # Shared utilities
│   ├── base/
│   │   ├── BaseController.ts   # Base controller class
│   │   ├── BaseService.ts      # Base service class
│   │   ├── BaseRepository.ts   # Base repository class
│   │   └── index.ts
│   ├── types/
│   │   ├── ApiResponse.ts      # Standardized API responses
│   │   └── index.ts
│   └── index.ts
│
├── services/                   # Cross-cutting services (legacy, to be migrated)
├── controllers/                # Legacy controllers (to be migrated)
├── routes/                     # Legacy routes (to be migrated)
└── server.ts                   # Application entry point
```

## Module Pattern

Each module follows a consistent layered architecture:

### 1. Types Layer (`PatientTypes.ts`)
- Defines DTOs (Data Transfer Objects)
- Interface definitions
- Type aliases

```typescript
export interface CreatePatientDTO {
  firstName: string;
  lastName: string;
  // ...
}
```

### 2. Repository Layer (`PatientRepository.ts`)
- Direct database operations
- Extends `BaseRepository` for common CRUD
- Query building and filtering

```typescript
export class PatientRepository extends BaseRepository<Patient, CreatePatientDTO, UpdatePatientDTO> {
  async findByNHISNumber(nhisNumber: string): Promise<Patient | null> {
    // Custom query
  }
}
```

### 3. Service Layer (`PatientService.ts`)
- Business logic
- Validation
- Transaction management
- Event publishing
- Extends `BaseService` for logging

```typescript
export class PatientService extends BaseService {
  async createPatient(data: CreatePatientDTO): Promise<Patient> {
    this.validateCreateData(data);
    await this.checkDuplicates(data);
    return this.repository.create(data);
  }
}
```

### 4. Controller Layer (`PatientController.ts`)
- HTTP request handling
- Request/response transformation
- Error handling
- Extends `BaseController` for standardized responses

```typescript
export class PatientController extends BaseController {
  async createPatient = this.asyncHandler(async (req, res) => {
    const patient = await this.service.createPatient(req.body);
    return this.created(res, patient, 'Patient created successfully');
  });
}
```

### 5. Routes Layer (`PatientRoutes.ts`)
- Route definitions
- Middleware application
- Controller binding

```typescript
const router = Router();
const controller = new PatientController();

router.post('/', controller.createPatient);
router.get('/:id', controller.getPatientById);

export default router;
```

## Benefits

### ✅ Separation of Concerns
- Each layer has a single responsibility
- Easy to understand and maintain

### ✅ Testability
- Services can be tested independently of HTTP
- Repositories can be mocked easily
- Controllers focus only on request/response

### ✅ Reusability
- Base classes provide common functionality
- Shared types across the application
- Consistent patterns

### ✅ Scalability
- Modules are independent and can be developed separately
- Easy to add new features
- Clear migration path from legacy code

### ✅ Type Safety
- Full TypeScript support
- DTOs ensure data integrity
- IntelliSense support

## Migration Strategy

### Phase 1: Foundation (COMPLETED)
- [x] Create base classes
- [x] Set up module structure
- [x] Create Patient module as reference

### Phase 2: Core Modules (IN PROGRESS)
- [ ] Migrate Auth module
- [ ] Migrate Billing module
- [ ] Migrate Attendance module

### Phase 3: Remaining Modules
- [ ] Inventory
- [ ] Reporting
- [ ] Appointments
- [ ] Wards/Admissions

### Phase 4: Cleanup
- [ ] Remove legacy controllers
- [ ] Update documentation
- [ ] Performance optimization

## Usage Example

### Creating a New Module

1. Create directory structure:
```bash
mkdir -p src/modules/billing
```

2. Create type definitions:
```typescript
// BillingTypes.ts
export interface CreateInvoiceDTO {
  patientId: string;
  items: InvoiceItem[];
  // ...
}
```

3. Create repository:
```typescript
// BillingRepository.ts
export class BillingRepository extends BaseRepository<Invoice, CreateInvoiceDTO, UpdateInvoiceDTO> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'invoice');
  }
}
```

4. Create service:
```typescript
// BillingService.ts
export class BillingService extends BaseService {
  private repository: BillingRepository;
  
  constructor(prisma: PrismaClient) {
    super('BillingService');
    this.repository = new BillingRepository(prisma);
  }
  
  async createInvoice(data: CreateInvoiceDTO): Promise<Invoice> {
    // Business logic
  }
}
```

5. Create controller:
```typescript
// BillingController.ts
export class BillingController extends BaseController {
  private service: BillingService;
  
  constructor() {
    super();
    this.service = new BillingService(prisma);
  }
  
  async createInvoice = this.asyncHandler(async (req, res) => {
    const invoice = await this.service.createInvoice(req.body);
    return this.created(res, invoice);
  });
}
```

6. Create routes:
```typescript
// BillingRoutes.ts
const router = Router();
const controller = new BillingController();

router.post('/invoices', controller.createInvoice);

export default router;
```

7. Register module:
```typescript
// modules/index.ts
import billingRoutes from './billing';

export function registerModules(app: Express) {
  app.use('/api/billing', billingRoutes);
}
```

## Best Practices

1. **Always use base classes** - Don't reinvent the wheel
2. **Keep controllers thin** - Business logic belongs in services
3. **Use DTOs** - Never expose database entities directly
4. **Handle errors gracefully** - Use the error handling provided by BaseController
5. **Log appropriately** - Use BaseService logging methods
6. **Write tests** - Each layer should have appropriate tests
7. **Document your code** - Use JSDoc comments

## API Response Format

All modules use standardized API responses:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Error responses:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

*This architecture ensures the Medicare HMS is maintainable, scalable, and enterprise-ready.*
