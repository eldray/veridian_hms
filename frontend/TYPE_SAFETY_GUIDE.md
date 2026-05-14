# Type Safety Guidelines

## Current Status
The frontend store layer currently has **553 instances** of `: any` type annotations, which defeats TypeScript's type safety.

## Problems with `any`

1. **No Type Checking**: TypeScript won't catch errors
2. **Poor IDE Support**: No autocomplete or IntelliSense
3. **Runtime Errors**: Type mismatches only discovered at runtime
4. **Maintenance Issues**: Hard to refactor safely

## How to Fix

### ❌ Bad - Using `any`
```typescript
interface PatientState {
  loadPatients: (filters?: any) => Promise<void>;
  addPatient: (data: FormData | any) => Promise<Patient>;
}
```

### ✅ Good - Using Proper Types
```typescript
interface PatientFilters {
  page?: number;
  limit?: number;
  search?: string;
  gender?: Gender;
  paymentMode?: PaymentMode;
}

interface PatientState {
  loadPatients: (filters?: PatientFilters) => Promise<void>;
  addPatient: (data: PatientCreateInput) => Promise<Patient>;
}
```

## Common Patterns

### 1. API Response Types
```typescript
// Instead of any
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}
```

### 2. Form Data Types
```typescript
interface PatientCreateInput {
  folderNumber: string;
  surname: string;
  otherNames: string;
  gender: Gender;
  dateOfBirth: string;
  contact: string;
  address: string;
  paymentMode?: PaymentMode;
  insuranceDetails?: InsuranceDetails;
}
```

### 3. Unknown vs Any
If you truly don't know the type, use `unknown` instead of `any`:
```typescript
// Safer than any
const data: unknown = await fetchData();

// You must narrow the type before using
if (typeof data === 'object' && data !== null && 'name' in data) {
  console.log(data.name); // ✅ Safe
}
```

## Migration Strategy

### Phase 1: Identify Critical Stores
Priority order based on usage:
1. `patientStore.ts` - Most critical, highest usage
2. `billingStore.ts` - Financial data, needs accuracy
3. `authStore.ts` - Security sensitive
4. `appointmentStore.ts` - Core functionality
5. Others...

### Phase 2: Create Type Definitions
Add to `frontend/src/types/index.ts`:
```typescript
// Store-specific types
export interface PatientFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface StorePagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### Phase 3: Incremental Replacement
1. Pick one store file
2. Replace all `any` with proper types
3. Run TypeScript compiler: `npm run type-check`
4. Fix any errors
5. Commit changes
6. Move to next store

## Tools

### Find All `any` Usages
```bash
# Count occurrences
grep -rn ": any" frontend/src/store --include="*.ts" | wc -l

# See locations
grep -rn ": any" frontend/src/store --include="*.ts"
```

### TypeScript Strict Mode
Ensure `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## Benefits of Fixing

1. **Fewer Bugs**: Catch errors at compile time
2. **Better DX**: Autocomplete and inline documentation
3. **Easier Refactoring**: TypeScript helps you find all usages
4. **Self-Documenting**: Types serve as documentation
5. **Team Collaboration**: Clear contracts between components

## Example Fix - Patient Store

Before:
```typescript
loadPatients: (filters?: any) => Promise<void>;
```

After:
```typescript
loadPatients: (filters?: {
  page?: number;
  limit?: number;
  search?: string;
  gender?: Gender;
  paymentMode?: PaymentMode;
}) => Promise<void>;
```

Or with named type:
```typescript
loadPatients: (filters?: PatientFilters) => Promise<void>;
```

## Checklist

- [ ] Replace `any` in function parameters
- [ ] Replace `any` in state properties
- [ ] Replace `any` in return types
- [ ] Use `unknown` for truly dynamic data
- [ ] Add type guards for runtime validation
- [ ] Enable strict mode in tsconfig
- [ ] Add ESLint rule to prevent new `any` usage

## ESLint Rule

Add to `.eslintrc.json`:
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "@typescript-eslint/no-unsafe-member-access": "warn",
    "@typescript-eslint/no-unsafe-call": "warn"
  }
}
```

This will warn whenever someone tries to use `any` in new code.
