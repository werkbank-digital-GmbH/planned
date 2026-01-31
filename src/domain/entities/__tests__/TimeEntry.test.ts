import { describe, it, expect } from 'vitest';

import { ValidationError } from '@/domain/errors';

import { TimeEntry, type CreateTimeEntryProps } from '../TimeEntry';

describe('TimeEntry', () => {
  const validProps: CreateTimeEntryProps = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    tenantId: 'tenant-123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-123e4567-e89b-12d3-a456-426614174000',
    date: new Date('2026-02-05'),
    hours: 8,
    timetacId: 'tt-123456',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  describe('create', () => {
    it('should create a valid TimeEntry', () => {
      const entry = TimeEntry.create(validProps);

      expect(entry.id).toBe(validProps.id);
      expect(entry.tenantId).toBe(validProps.tenantId);
      expect(entry.userId).toBe(validProps.userId);
      expect(entry.date).toEqual(new Date('2026-02-05'));
      expect(entry.hours).toBe(8);
      expect(entry.timetacId).toBe('tt-123456');
    });

    it('should create TimeEntry with optional projectPhaseId', () => {
      const entry = TimeEntry.create({
        ...validProps,
        projectPhaseId: 'phase-123',
      });

      expect(entry.projectPhaseId).toBe('phase-123');
      expect(entry.isAssignedToPhase).toBe(true);
    });

    it('should create TimeEntry with optional description', () => {
      const entry = TimeEntry.create({
        ...validProps,
        description: 'Holzrahmenbau Montage',
      });

      expect(entry.description).toBe('Holzrahmenbau Montage');
    });

    it('should trim description', () => {
      const entry = TimeEntry.create({
        ...validProps,
        description: '  Montage  ',
      });

      expect(entry.description).toBe('Montage');
    });

    it('should have isAssignedToPhase false when no phase', () => {
      const entry = TimeEntry.create(validProps);

      expect(entry.isAssignedToPhase).toBe(false);
    });

    describe('timetacId validation', () => {
      it('should throw ValidationError when timetacId is empty', () => {
        expect(() =>
          TimeEntry.create({
            ...validProps,
            timetacId: '',
          })
        ).toThrow(ValidationError);
        expect(() =>
          TimeEntry.create({
            ...validProps,
            timetacId: '',
          })
        ).toThrow('TimeTac-ID ist erforderlich');
      });

      it('should throw ValidationError when timetacId is only whitespace', () => {
        expect(() =>
          TimeEntry.create({
            ...validProps,
            timetacId: '   ',
          })
        ).toThrow(ValidationError);
      });

      it('should trim timetacId', () => {
        const entry = TimeEntry.create({
          ...validProps,
          timetacId: '  tt-123  ',
        });

        expect(entry.timetacId).toBe('tt-123');
      });
    });

    describe('hours validation', () => {
      it('should throw ValidationError when hours is negative', () => {
        expect(() =>
          TimeEntry.create({
            ...validProps,
            hours: -1,
          })
        ).toThrow(ValidationError);
        expect(() =>
          TimeEntry.create({
            ...validProps,
            hours: -1,
          })
        ).toThrow('Stunden müssen zwischen 0 und 24 liegen');
      });

      it('should throw ValidationError when hours is greater than 24', () => {
        expect(() =>
          TimeEntry.create({
            ...validProps,
            hours: 25,
          })
        ).toThrow(ValidationError);
        expect(() =>
          TimeEntry.create({
            ...validProps,
            hours: 25,
          })
        ).toThrow('Stunden müssen zwischen 0 und 24 liegen');
      });

      it('should allow 0 hours', () => {
        const entry = TimeEntry.create({
          ...validProps,
          hours: 0,
        });

        expect(entry.hours).toBe(0);
      });

      it('should allow exactly 24 hours', () => {
        const entry = TimeEntry.create({
          ...validProps,
          hours: 24,
        });

        expect(entry.hours).toBe(24);
      });

      it('should allow decimal hours', () => {
        const entry = TimeEntry.create({
          ...validProps,
          hours: 7.5,
        });

        expect(entry.hours).toBe(7.5);
      });
    });

    describe('date validation', () => {
      it('should throw ValidationError when date is invalid', () => {
        expect(() =>
          TimeEntry.create({
            ...validProps,
            date: new Date('invalid'),
          })
        ).toThrow(ValidationError);
        expect(() =>
          TimeEntry.create({
            ...validProps,
            date: new Date('invalid'),
          })
        ).toThrow('Gültiges Datum erforderlich');
      });
    });
  });

  describe('dateString', () => {
    it('should return date as ISO string (YYYY-MM-DD)', () => {
      const entry = TimeEntry.create({
        ...validProps,
        date: new Date('2026-02-05'),
      });

      expect(entry.dateString).toBe('2026-02-05');
    });
  });

  describe('withPhase', () => {
    it('should update phase and return new instance', () => {
      const entry = TimeEntry.create(validProps);
      const updated = entry.withPhase('phase-123');

      expect(updated).not.toBe(entry); // Immutability
      expect(updated.projectPhaseId).toBe('phase-123');
      expect(updated.isAssignedToPhase).toBe(true);
      expect(entry.projectPhaseId).toBeUndefined(); // Original unchanged
    });

    it('should allow removing phase assignment', () => {
      const entry = TimeEntry.create({
        ...validProps,
        projectPhaseId: 'phase-123',
      });
      const updated = entry.withPhase(undefined);

      expect(updated.projectPhaseId).toBeUndefined();
      expect(updated.isAssignedToPhase).toBe(false);
    });
  });

  describe('withHours', () => {
    it('should update hours and return new instance', () => {
      const entry = TimeEntry.create(validProps);
      const updated = entry.withHours(4.5);

      expect(updated).not.toBe(entry); // Immutability
      expect(updated.hours).toBe(4.5);
      expect(entry.hours).toBe(8); // Original unchanged
    });

    it('should throw ValidationError for invalid hours', () => {
      const entry = TimeEntry.create(validProps);

      expect(() => entry.withHours(-1)).toThrow(ValidationError);
      expect(() => entry.withHours(25)).toThrow(ValidationError);
    });
  });
});
