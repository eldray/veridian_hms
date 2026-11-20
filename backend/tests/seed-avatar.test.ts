import { describe, expect, it } from 'vitest';
import { seedAvatarUrl } from '../src/seed/testSeed/avatars.js';

describe('demo seed avatar storage URLs', () => {
  it('uses the protected patient upload route for photographic demo portraits', () => {
    expect(seedAvatarUrl('patients', 'seed-123.jpg')).toBe('/uploads/patients/seed-123.jpg');
  });

  it('uses the protected API upload route for staff photographic demo portraits', () => {
    expect(seedAvatarUrl('users', 'seed-456.jpg')).toBe('/api/uploads/users/seed-456.jpg');
  });
});
