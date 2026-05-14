# Contributing to Medicare Hospital Management System

Thank you for your interest in contributing! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Git Workflow](#git-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Collaborate openly
- Maintain professionalism

## Getting Started

### 1. Fork the Repository
Click "Fork" on GitHub to create your copy.

### 2. Clone Your Fork
```bash
git clone https://github.com/YOUR_USERNAME/hospital-management-system.git
cd hospital-management-system
```

### 3. Add Upstream Remote
```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/hospital-management-system.git
git fetch upstream
```

## Development Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Git
- VS Code (recommended)

### Installation
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies  
cd ../frontend
npm install

# Set up environment variables
cp .env.example .env  # Edit with your values
```

### Database Setup
```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Run migrations
npm run db:migrate

# Seed database (optional)
npm run seed
```

### Running the Application
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Electron (optional)
npm run electron:dev
```

## Coding Standards

### TypeScript

#### Use Strict Types
```typescript
// ❌ Bad
const data: any = await fetchData();

// ✅ Good
interface UserData {
  id: string;
  name: string;
}
const data: UserData = await fetchData();
```

#### Prefer Interfaces for Objects
```typescript
// ✅ Good
interface Patient {
  id: string;
  surname: string;
  otherNames: string;
  dateOfBirth: Date;
}
```

#### Use Type Guards
```typescript
function isPatient(data: unknown): data is Patient {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'surname' in data
  );
}
```

### Naming Conventions

- **Files**: camelCase.ts (e.g., `patientStore.ts`)
- **Components**: PascalCase.tsx (e.g., `PatientList.tsx`)
- **Constants**: UPPER_SNAKE_CASE
- **Functions/Variables**: camelCase
- **Types/Interfaces**: PascalCase

### Code Organization

#### Backend Structure
```
backend/src/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── routes/          # Route definitions
├── services/        # Business logic
├── utils/           # Helper functions
├── types/           # TypeScript types
└── tests/           # Test files
```

#### Frontend Structure
```
frontend/src/
├── components/      # Reusable components
├── pages/           # Page components
├── store/           # Zustand stores
├── api/             # API client
├── types/           # TypeScript types
├── utils/           # Helper functions
└── assets/          # Static assets
```

### Error Handling

#### Backend
```typescript
import { AppError, asyncHandler } from '../utils/helpers.js';

export const getPatient = asyncHandler(async (req, res) => {
  const patient = await prisma.patient.findUnique({
    where: { id: req.params.id }
  });
  
  if (!patient) {
    throw new NotFoundError('Patient');
  }
  
  res.json(formatResponse(patient));
});
```

#### Frontend
```typescript
try {
  const patient = await patientStore.fetchPatient(id);
} catch (error) {
  if (error instanceof ApiError) {
    toast.error(error.message);
  } else {
    toast.error('An unexpected error occurred');
  }
}
```

## Git Workflow

### Branch Naming
```
feature/add-patient-search
bugfix/fix-billing-calculation
docs/update-readme
refactor/improve-type-safety
test/add-patient-tests
```

### Commit Messages
Follow Conventional Commits:

```
feat: add patient search functionality
fix: resolve billing calculation error
docs: update API documentation
refactor: improve type safety in stores
test: add unit tests for patient service
chore: update dependencies
```

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

### Example Workflow
```bash
# Create feature branch
git checkout -b feature/add-patient-search

# Make changes and commit
git add .
git commit -m "feat(patient): add search by folder number"

# Sync with upstream
git fetch upstream
git rebase upstream/main

# Push to your fork
git push origin feature/add-patient-search
```

## Testing Guidelines

### Backend Tests
```bash
cd backend

# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Writing Tests
```typescript
// backend/tests/unit/patient.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateAge } from '../../src/utils/helpers.js';

describe('calculateAge', () => {
  it('should calculate correct age', () => {
    const birthDate = new Date('2000-01-01');
    const age = calculateAge(birthDate);
    expect(age).toBeGreaterThan(0);
  });
});
```

### Frontend Tests
```bash
cd frontend

# Run tests
npm test

# Watch mode
npm run test:watch
```

### Test Coverage Goals
- Unit tests: >80% coverage
- Critical paths: 100% coverage
- Integration tests for all API endpoints

## Documentation

### Code Comments
```typescript
/**
 * Calculate patient age from date of birth
 * @param dateOfBirth - The patient's birth date
 * @returns Age in years (0 if invalid)
 */
export const calculateAge = (dateOfBirth: Date): number => {
  // Implementation
};
```

### README Updates
Update README.md when:
- Adding new features
- Changing installation steps
- Modifying API endpoints
- Updating environment variables

### API Documentation
Document all endpoints in OpenAPI/Swagger format or in API_GUIDE.md.

## Pull Request Process

### Before Submitting

1. **Test Your Changes**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

2. **Update Documentation**
   - README.md
   - API docs
   - Code comments

3. **Check Code Quality**
   ```bash
   npm run lint
   npm run format
   ```

4. **Rebase on Main**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manually tested

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally

## Related Issues
Closes #123
```

### Review Process

1. Submit PR
2. Wait for automated checks
3. Address review comments
4. Request re-review
5. Merge after approval

## Common Tasks

### Adding a New Feature

1. Create issue describing feature
2. Create feature branch
3. Implement feature
4. Write tests
5. Update documentation
6. Submit PR

### Fixing a Bug

1. Create/reproduce bug
2. Create bugfix branch
3. Fix bug
4. Add test to prevent regression
5. Submit PR

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update safely
npm update

# Update major versions (careful!)
npm install package@latest
```

## Getting Help

- Check existing issues
- Read documentation
- Ask in discussions
- Contact maintainers

## Recognition

Contributors will be acknowledged in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing! 🎉
