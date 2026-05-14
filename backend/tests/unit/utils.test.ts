import { describe, it, expect } from 'vitest';
import { calculateAge } from '../../src/utils/helpers.js';

describe('Utility Functions', () => {
  describe('calculateAge', () => {
    it('should calculate age correctly for adult', () => {
      const birthDate = new Date('1990-01-01');
      const age = calculateAge(birthDate);
      expect(age).toBeGreaterThan(0);
      expect(age).toBeLessThan(100);
    });

    it('should calculate age correctly for child', () => {
      const birthDate = new Date('2020-01-01');
      const age = calculateAge(birthDate);
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(10);
    });

    it('should handle today\'s date as birthdate', () => {
      const birthDate = new Date();
      const age = calculateAge(birthDate);
      expect(age).toBe(0);
    });

    it('should handle future date gracefully', () => {
      const birthDate = new Date('2050-01-01');
      const age = calculateAge(birthDate);
      expect(age).toBeLessThanOrEqual(0);
    });
  });
});
