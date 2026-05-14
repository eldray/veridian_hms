import { beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress logs during tests unless explicitly needed
  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterAll(() => {
  // Restore original console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
export const mockUser = {
  id: 'test-user-id',
  userId: 'test-user-id',
  username: 'testuser',
  role: 'doctor' as any,
  fullName: 'Test User'
};

export const mockPatient = {
  id: 'test-patient-id',
  patientId: 'PAT-10000',
  firstName: 'Test',
  lastName: 'Patient',
  dateOfBirth: new Date('1990-01-01'),
  gender: 'male'
};
