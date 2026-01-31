import { describe, it, expect } from 'vitest';

import { ErrorCodes, ErrorMessages, getErrorMessage, type ErrorCode } from '../ErrorCodes';

describe('ErrorCodes', () => {
  describe('ErrorCodes object', () => {
    it('should have authentication error codes', () => {
      expect(ErrorCodes.AUTH_INVALID_CREDENTIALS).toBe('AUTH_INVALID_CREDENTIALS');
      expect(ErrorCodes.AUTH_SESSION_EXPIRED).toBe('AUTH_SESSION_EXPIRED');
      expect(ErrorCodes.AUTH_UNAUTHORIZED).toBe('AUTH_UNAUTHORIZED');
      expect(ErrorCodes.AUTH_FORBIDDEN).toBe('AUTH_FORBIDDEN');
    });

    it('should have validation error codes', () => {
      expect(ErrorCodes.VALIDATION_REQUIRED_FIELD).toBe('VALIDATION_REQUIRED_FIELD');
      expect(ErrorCodes.VALIDATION_INVALID_FORMAT).toBe('VALIDATION_INVALID_FORMAT');
      expect(ErrorCodes.VALIDATION_INVALID_DATE).toBe('VALIDATION_INVALID_DATE');
    });

    it('should have allocation error codes', () => {
      expect(ErrorCodes.ALLOCATION_NOT_FOUND).toBe('ALLOCATION_NOT_FOUND');
      expect(ErrorCodes.ALLOCATION_USER_OR_RESOURCE_REQUIRED).toBe(
        'ALLOCATION_USER_OR_RESOURCE_REQUIRED'
      );
      expect(ErrorCodes.ALLOCATION_CANNOT_HAVE_BOTH).toBe('ALLOCATION_CANNOT_HAVE_BOTH');
    });

    it('should have external service error codes', () => {
      expect(ErrorCodes.ASANA_ERROR).toBe('ASANA_ERROR');
      expect(ErrorCodes.ASANA_RATE_LIMIT).toBe('ASANA_RATE_LIMIT');
      expect(ErrorCodes.TIMETAC_ERROR).toBe('TIMETAC_ERROR');
    });

    it('should have internal error codes', () => {
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCodes.DATABASE_ERROR).toBe('DATABASE_ERROR');
    });
  });

  describe('ErrorMessages', () => {
    it('should have a message for every error code', () => {
      const errorCodeValues = Object.values(ErrorCodes) as ErrorCode[];

      for (const code of errorCodeValues) {
        expect(ErrorMessages[code]).toBeDefined();
        expect(typeof ErrorMessages[code]).toBe('string');
        expect(ErrorMessages[code].length).toBeGreaterThan(0);
      }
    });

    it('should have German messages', () => {
      expect(ErrorMessages.AUTH_INVALID_CREDENTIALS).toBe('Ungültige Anmeldedaten');
      expect(ErrorMessages.NOT_FOUND).toBe('Nicht gefunden');
      expect(ErrorMessages.USER_NOT_FOUND).toBe('Mitarbeiter nicht gefunden');
    });
  });

  describe('getErrorMessage', () => {
    it('should return the message for a valid error code', () => {
      expect(getErrorMessage('AUTH_INVALID_CREDENTIALS')).toBe(
        'Ungültige Anmeldedaten'
      );
      expect(getErrorMessage('NOT_FOUND')).toBe('Nicht gefunden');
    });

    it('should return internal error message for unknown codes', () => {
      // @ts-expect-error Testing invalid input
      expect(getErrorMessage('UNKNOWN_CODE')).toBe(
        'Ein unerwarteter Fehler ist aufgetreten'
      );
    });
  });

  describe('ErrorCode type', () => {
    it('should accept valid error codes', () => {
      const code: ErrorCode = 'AUTH_INVALID_CREDENTIALS';
      expect(code).toBe('AUTH_INVALID_CREDENTIALS');
    });
  });
});
