# Type Safety Improvements for Zustand Stores

## Overview
This document tracks the ongoing effort to eliminate `any` types from our Zustand stores and replace them with proper TypeScript interfaces.

## Progress
- **Starting Count**: 588 instances of `any`
- **Current Count**: ~220 instances remaining
- **Target**: < 50 instances (only where absolutely necessary)

## Completed Fixes

### 1. authStore.ts ✅
- Replaced `userData: any` with `RegisterRequest`
- Replaced `updateProfile(data: Partial<User>)` with `ProfileUpdateRequest`
- Changed all `catch (error)` to `catch (error: unknown)`

### 2. patientStore.ts ✅
- Added `PatientFilters` interface
- Replaced `filters?: any` with `filters?: PatientFilters`
- Replaced `data: FormData | any` with `data: FormData | Partial<Patient>`
- Changed helper functions to use proper types
- Fixed all catch blocks

### 3. admissionStore.ts ✅
- Created `admission.ts` types file with:
  - `AdmissionFilters`
  - `AdmissionStats`
  - `DailyNote`
  - `DischargeData`
  - `SecondaryDiagnosisData`
- Replaced all `any` in function signatures
- Typed transform function properly

### 4. billingStore.ts 🔄
- Created `billing.ts` types file
- Ready for implementation

## Remaining Work

### High Priority Stores
1. **attendanceStore.ts** - Largest file, many `any` types
2. **medicalServicesStore.ts** - Complex service catalog types
3. **insuranceStore.ts** - Insurance claim types needed
4. **stockStore.ts** - Inventory management types

### Medium Priority Stores
5. **appointmentStore.ts**
6. **departmentStore.ts**
7. **wardStore.ts**
8. **reportsStore.ts**

### Low Priority Stores
9. **antenatalStore.ts**
10. **deliveryStore.ts**
11. **postnatalStore.ts**
12. Smaller utility stores

## Guidelines

### When `any` is Acceptable
- Dynamic API response structures that vary wildly
- Third-party library callbacks without types
- Temporary migration states

### When to Avoid `any`
- Function parameters (use `unknown` or specific types)
- State properties (define interfaces)
- Return types (always specify)

## Migration Pattern

```typescript
// ❌ Before
interface State {
  data: any[];
  loadData: (filters: any) => Promise<void>;
}

// ✅ After
interface DataFilters {
  page?: number;
  limit?: number;
  search?: string;
}

interface State {
  data: DataType[];
  loadData: (filters: DataFilters) => Promise<void>;
}
```

## Testing
After each store migration:
1. Run `npm run type-check` in frontend directory
2. Fix any new TypeScript errors
3. Test the affected UI components
4. Update this document

## Next Steps
1. Continue with attendanceStore.ts (largest impact)
2. Create additional type definition files as needed
3. Add ESLint rule to prevent new `any` types
4. Set up automated type safety checks in CI/CD
