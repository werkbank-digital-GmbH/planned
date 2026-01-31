import { describe, it, expect } from 'vitest';

import {
  DomainError,
  ValidationError,
  NotFoundError,
  AuthorizationError,
  ConflictError,
} from '../index';

describe('Domain Errors', () => {
  describe('DomainError', () => {
    it('should be an instance of Error', () => {
      const error = new ValidationError('Test error');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof DomainError).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with code', () => {
      const error = new ValidationError('E-Mail ist ungültig');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('E-Mail ist ungültig');
      expect(error.name).toBe('ValidationError');
    });

    it('should include details when provided', () => {
      const error = new ValidationError('Feld ist erforderlich', {
        field: 'email',
      });
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('NotFoundError', () => {
    it('should create NotFoundError with entity info', () => {
      const error = new NotFoundError('User', '123');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('User mit ID 123 nicht gefunden');
      expect(error.name).toBe('NotFoundError');
    });

    it('should include entity info in details', () => {
      const error = new NotFoundError('Project', 'abc-def');
      expect(error.details).toEqual({
        entityType: 'Project',
        entityId: 'abc-def',
      });
    });
  });

  describe('AuthorizationError', () => {
    it('should create AuthorizationError with default message', () => {
      const error = new AuthorizationError();
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Keine Berechtigung für diese Aktion');
      expect(error.name).toBe('AuthorizationError');
    });

    it('should create AuthorizationError with custom message', () => {
      const error = new AuthorizationError('Nur Admins dürfen Benutzer löschen');
      expect(error.message).toBe('Nur Admins dürfen Benutzer löschen');
    });
  });

  describe('ConflictError', () => {
    it('should create ConflictError with message', () => {
      const error = new ConflictError('Diese Zuweisung existiert bereits');
      expect(error.code).toBe('CONFLICT');
      expect(error.message).toBe('Diese Zuweisung existiert bereits');
      expect(error.name).toBe('ConflictError');
    });

    it('should include details when provided', () => {
      const error = new ConflictError('E-Mail bereits vergeben', {
        field: 'email',
        value: 'test@test.de',
      });
      expect(error.details).toEqual({
        field: 'email',
        value: 'test@test.de',
      });
    });
  });

  describe('Error inheritance', () => {
    it('should preserve stack trace', () => {
      const error = new ValidationError('Test');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });

    it('should be catchable as Error', () => {
      const throwError = () => {
        throw new NotFoundError('User', '123');
      };

      expect(throwError).toThrow(Error);
      expect(throwError).toThrow(NotFoundError);

      // Test DomainError inheritance via instanceof
      try {
        throwError();
      } catch (e) {
        expect(e instanceof DomainError).toBe(true);
      }
    });
  });
});
