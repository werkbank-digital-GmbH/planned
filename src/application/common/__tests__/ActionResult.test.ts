import { describe, it, expect } from 'vitest';

import { Result } from '../ActionResult';

describe('ActionResult', () => {
  describe('Result.ok', () => {
    it('should create success result with data', () => {
      const result = Result.ok({ id: '123', name: 'Test' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ id: '123', name: 'Test' });
      }
    });

    it('should create success result with null data', () => {
      const result = Result.ok(null);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should create success result with array data', () => {
      const result = Result.ok([1, 2, 3]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([1, 2, 3]);
      }
    });
  });

  describe('Result.fail', () => {
    it('should create failure result with error', () => {
      const result = Result.fail('NOT_FOUND', 'Ressource nicht gefunden');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
        expect(result.error.message).toBe('Ressource nicht gefunden');
      }
    });

    it('should include details when provided', () => {
      const result = Result.fail('VALIDATION_ERROR', 'Ungültig', { field: 'email' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details).toEqual({ field: 'email' });
      }
    });

    it('should not include details when not provided', () => {
      const result = Result.fail('INTERNAL_ERROR', 'Ein Fehler ist aufgetreten');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details).toBeUndefined();
      }
    });
  });

  describe('Type narrowing', () => {
    it('should allow type narrowing with success check', () => {
      const result = Result.ok({ value: 42 });

      if (result.success) {
        // TypeScript sollte hier den Typ als ActionSuccess<{value: number}> erkennen
        expect(result.data.value).toBe(42);
      }
    });

    it('should allow type narrowing for failure', () => {
      const result = Result.fail('ERROR', 'Fehler');

      if (!result.success) {
        // TypeScript sollte hier den Typ als ActionFailure erkennen
        expect(result.error.code).toBe('ERROR');
      }
    });
  });
});
