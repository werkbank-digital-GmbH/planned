import { describe, it, expect } from 'vitest';

import { ValidationError } from '@/domain/errors';

import { Absence, type CreateAbsenceProps, ABSENCE_TYPE_LABELS } from '../Absence';

describe('Absence', () => {
  const validProps: CreateAbsenceProps = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    tenantId: 'tenant-123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-123e4567-e89b-12d3-a456-426614174000',
    type: 'vacation',
    startDate: new Date('2026-02-05'),
    endDate: new Date('2026-02-07'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  describe('create', () => {
    it('should create a valid Absence', () => {
      const absence = Absence.create(validProps);

      expect(absence.id).toBe(validProps.id);
      expect(absence.tenantId).toBe(validProps.tenantId);
      expect(absence.userId).toBe(validProps.userId);
      expect(absence.type).toBe('vacation');
      expect(absence.startDate).toEqual(new Date('2026-02-05'));
      expect(absence.endDate).toEqual(new Date('2026-02-07'));
    });

    it('should create Absence with optional notes', () => {
      const absence = Absence.create({
        ...validProps,
        notes: 'Familienurlaub',
      });

      expect(absence.notes).toBe('Familienurlaub');
    });

    it('should create Absence with timetacId', () => {
      const absence = Absence.create({
        ...validProps,
        timetacId: 'timetac-12345',
      });

      expect(absence.timetacId).toBe('timetac-12345');
      expect(absence.isFromTimeTac).toBe(true);
    });

    it('should trim notes', () => {
      const absence = Absence.create({
        ...validProps,
        notes: '  Notiz mit Leerzeichen  ',
      });

      expect(absence.notes).toBe('Notiz mit Leerzeichen');
    });

    it('should throw ValidationError when end date is before start date', () => {
      expect(() =>
        Absence.create({
          ...validProps,
          startDate: new Date('2026-02-07'),
          endDate: new Date('2026-02-05'),
        })
      ).toThrow(ValidationError);
      expect(() =>
        Absence.create({
          ...validProps,
          startDate: new Date('2026-02-07'),
          endDate: new Date('2026-02-05'),
        })
      ).toThrow('Enddatum muss nach Startdatum liegen');
    });

    it('should allow same day for start and end (single day absence)', () => {
      const absence = Absence.create({
        ...validProps,
        startDate: new Date('2026-02-05'),
        endDate: new Date('2026-02-05'),
      });

      expect(absence.durationDays).toBe(1);
    });

    it('should throw ValidationError for invalid absence type', () => {
      expect(() =>
        Absence.create({
          ...validProps,
          // @ts-expect-error Testing invalid type
          type: 'invalid',
        })
      ).toThrow(ValidationError);
      expect(() =>
        Absence.create({
          ...validProps,
          // @ts-expect-error Testing invalid type
          type: 'invalid',
        })
      ).toThrow('Ungültiger Abwesenheitstyp');
    });

    it('should accept all valid absence types', () => {
      const types = ['vacation', 'sick', 'holiday', 'training', 'other'] as const;

      for (const type of types) {
        const absence = Absence.create({ ...validProps, type });
        expect(absence.type).toBe(type);
      }
    });
  });

  describe('durationDays', () => {
    it('should calculate duration for multi-day absence', () => {
      const absence = Absence.create({
        ...validProps,
        startDate: new Date('2026-02-05'),
        endDate: new Date('2026-02-07'),
      });

      expect(absence.durationDays).toBe(3); // 5, 6, 7 = 3 Tage
    });

    it('should return 1 for single day absence', () => {
      const absence = Absence.create({
        ...validProps,
        startDate: new Date('2026-02-05'),
        endDate: new Date('2026-02-05'),
      });

      expect(absence.durationDays).toBe(1);
    });

    it('should calculate duration for week-long absence', () => {
      const absence = Absence.create({
        ...validProps,
        startDate: new Date('2026-02-02'),
        endDate: new Date('2026-02-06'),
      });

      expect(absence.durationDays).toBe(5);
    });
  });

  describe('includesDate', () => {
    it('should return true for date within absence range', () => {
      const absence = Absence.create({
        ...validProps,
        startDate: new Date('2026-02-05'),
        endDate: new Date('2026-02-07'),
      });

      expect(absence.includesDate(new Date('2026-02-06'))).toBe(true);
    });

    it('should return true for start date', () => {
      const absence = Absence.create({
        ...validProps,
        startDate: new Date('2026-02-05'),
        endDate: new Date('2026-02-07'),
      });

      expect(absence.includesDate(new Date('2026-02-05'))).toBe(true);
    });

    it('should return true for end date', () => {
      const absence = Absence.create({
        ...validProps,
        startDate: new Date('2026-02-05'),
        endDate: new Date('2026-02-07'),
      });

      expect(absence.includesDate(new Date('2026-02-07'))).toBe(true);
    });

    it('should return false for date before absence', () => {
      const absence = Absence.create({
        ...validProps,
        startDate: new Date('2026-02-05'),
        endDate: new Date('2026-02-07'),
      });

      expect(absence.includesDate(new Date('2026-02-04'))).toBe(false);
    });

    it('should return false for date after absence', () => {
      const absence = Absence.create({
        ...validProps,
        startDate: new Date('2026-02-05'),
        endDate: new Date('2026-02-07'),
      });

      expect(absence.includesDate(new Date('2026-02-08'))).toBe(false);
    });

    it('should handle different time zones correctly', () => {
      const absence = Absence.create({
        ...validProps,
        startDate: new Date('2026-02-05T00:00:00Z'),
        endDate: new Date('2026-02-07T23:59:59Z'),
      });

      // Mitte des Tages sollte enthalten sein
      expect(absence.includesDate(new Date('2026-02-06T12:00:00Z'))).toBe(true);
    });
  });

  describe('typeLabel', () => {
    it('should return correct German label for vacation', () => {
      const absence = Absence.create({ ...validProps, type: 'vacation' });
      expect(absence.typeLabel).toBe('Urlaub');
    });

    it('should return correct German label for sick', () => {
      const absence = Absence.create({ ...validProps, type: 'sick' });
      expect(absence.typeLabel).toBe('Krank');
    });

    it('should return correct German label for holiday', () => {
      const absence = Absence.create({ ...validProps, type: 'holiday' });
      expect(absence.typeLabel).toBe('Feiertag');
    });

    it('should return correct German label for training', () => {
      const absence = Absence.create({ ...validProps, type: 'training' });
      expect(absence.typeLabel).toBe('Fortbildung');
    });

    it('should return correct German label for other', () => {
      const absence = Absence.create({ ...validProps, type: 'other' });
      expect(absence.typeLabel).toBe('Sonstiges');
    });
  });

  describe('isFromTimeTac', () => {
    it('should return true when timetacId is set', () => {
      const absence = Absence.create({
        ...validProps,
        timetacId: 'timetac-12345',
      });

      expect(absence.isFromTimeTac).toBe(true);
    });

    it('should return false when timetacId is undefined', () => {
      const absence = Absence.create(validProps);

      expect(absence.isFromTimeTac).toBe(false);
    });
  });

  describe('ABSENCE_TYPE_LABELS', () => {
    it('should have labels for all types', () => {
      expect(ABSENCE_TYPE_LABELS.vacation).toBe('Urlaub');
      expect(ABSENCE_TYPE_LABELS.sick).toBe('Krank');
      expect(ABSENCE_TYPE_LABELS.holiday).toBe('Feiertag');
      expect(ABSENCE_TYPE_LABELS.training).toBe('Fortbildung');
      expect(ABSENCE_TYPE_LABELS.other).toBe('Sonstiges');
    });
  });

  describe('withNotes', () => {
    it('should update notes and return new instance', () => {
      const absence = Absence.create(validProps);
      const updated = absence.withNotes('Neue Notiz');

      expect(updated).not.toBe(absence); // Immutability
      expect(updated.notes).toBe('Neue Notiz');
      expect(absence.notes).toBeUndefined(); // Original unchanged
    });

    it('should allow setting notes to undefined', () => {
      const absence = Absence.create({ ...validProps, notes: 'Test' });
      const updated = absence.withNotes(undefined);

      expect(updated.notes).toBeUndefined();
    });
  });

  describe('withDateRange', () => {
    it('should update date range and return new instance', () => {
      const absence = Absence.create(validProps);
      const updated = absence.withDateRange(new Date('2026-03-01'), new Date('2026-03-05'));

      expect(updated).not.toBe(absence); // Immutability
      expect(updated.startDate).toEqual(new Date('2026-03-01'));
      expect(updated.endDate).toEqual(new Date('2026-03-05'));
    });

    it('should throw ValidationError for invalid date range', () => {
      const absence = Absence.create(validProps);

      expect(() =>
        absence.withDateRange(new Date('2026-03-05'), new Date('2026-03-01'))
      ).toThrow(ValidationError);
    });
  });

  describe('withType', () => {
    it('should update type and return new instance', () => {
      const absence = Absence.create(validProps);
      const updated = absence.withType('sick');

      expect(updated).not.toBe(absence); // Immutability
      expect(updated.type).toBe('sick');
      expect(absence.type).toBe('vacation'); // Original unchanged
    });

    it('should throw ValidationError for invalid type', () => {
      const absence = Absence.create(validProps);

      // @ts-expect-error Testing invalid type
      expect(() => absence.withType('invalid')).toThrow(ValidationError);
    });
  });
});
