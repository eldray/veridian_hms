import { describe, expect, it } from 'vitest';
import { seedAvatarUrl } from '../src/seed/testSeed/avatars.js';

describe('demo seed avatar storage URLs', () => {
  it('uses the protected patient upload route for patient portraits', () => {
    expect(seedAvatarUrl('patients', 'seed-123.png')).toBe('/uploads/patients/seed-123.png');
  });

  it('uses the protected API upload route for staff portraits', () => {
    expect(seedAvatarUrl('users', 'seed-456.png')).toBe('/api/uploads/users/seed-456.png');
  });
});
