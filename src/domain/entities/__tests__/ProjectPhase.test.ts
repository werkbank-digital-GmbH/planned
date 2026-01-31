import { describe, it, expect } from 'vitest';

import { ValidationError } from '@/domain/errors';
import { type PhaseBereich, type PhaseStatus } from '@/domain/types';

import { ProjectPhase, type CreateProjectPhaseProps } from '../ProjectPhase';

describe('ProjectPhase', () => {
  const validProps: CreateProjectPhaseProps = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    projectId: 'project-123e4567-e89b-12d3-a456-426614174000',
    tenantId: 'tenant-123e4567-e89b-12d3-a456-426614174000',
    name: 'Elementierung',
    bereich: 'produktion',
    sortOrder: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  describe('create', () => {
    it('should create a valid ProjectPhase', () => {
      // Act
      const phase = ProjectPhase.create(validProps);

      // Assert
      expect(phase.id).toBe(validProps.id);
      expect(phase.projectId).toBe(validProps.projectId);
      expect(phase.tenantId).toBe(validProps.tenantId);
      expect(phase.name).toBe('Elementierung');
      expect(phase.bereich).toBe('produktion');
      expect(phase.sortOrder).toBe(1);
    });

    it('should create phase with bereich produktion', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        bereich: 'produktion',
      });

      expect(phase.bereich).toBe('produktion');
      expect(phase.bereichLabel).toBe('PRODUKTION');
    });

    it('should create phase with bereich montage', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        bereich: 'montage',
      });

      expect(phase.bereich).toBe('montage');
      expect(phase.bereichLabel).toBe('MONTAGE');
    });

    it('should create phase with all valid bereiche', () => {
      const bereiche: PhaseBereich[] = ['produktion', 'montage'];

      bereiche.forEach((bereich) => {
        const phase = ProjectPhase.create({ ...validProps, bereich });
        expect(phase.bereich).toBe(bereich);
      });
    });

    it('should create phase with optional fields', () => {
      const propsWithOptional: CreateProjectPhaseProps = {
        ...validProps,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-03-15'),
        budgetHours: 40,
        plannedHours: 35,
        actualHours: 28,
        asanaGid: '1234567890',
      };

      const phase = ProjectPhase.create(propsWithOptional);

      expect(phase.startDate).toEqual(new Date('2026-02-01'));
      expect(phase.endDate).toEqual(new Date('2026-03-15'));
      expect(phase.budgetHours).toBe(40);
      expect(phase.plannedHours).toBe(35);
      expect(phase.actualHours).toBe(28);
      expect(phase.asanaGid).toBe('1234567890');
    });

    it('should default plannedHours and actualHours to 0', () => {
      const phase = ProjectPhase.create(validProps);

      expect(phase.plannedHours).toBe(0);
      expect(phase.actualHours).toBe(0);
    });

    it('should default status to active', () => {
      const phase = ProjectPhase.create(validProps);

      expect(phase.status).toBe('active');
    });

    it('should throw ValidationError when name is empty', () => {
      const invalidProps: CreateProjectPhaseProps = {
        ...validProps,
        name: '',
      };

      expect(() => ProjectPhase.create(invalidProps)).toThrow(ValidationError);
      expect(() => ProjectPhase.create(invalidProps)).toThrow(
        'Phasenname ist erforderlich'
      );
    });

    it('should throw ValidationError when name is only whitespace', () => {
      const invalidProps: CreateProjectPhaseProps = {
        ...validProps,
        name: '   ',
      };

      expect(() => ProjectPhase.create(invalidProps)).toThrow(ValidationError);
      expect(() => ProjectPhase.create(invalidProps)).toThrow(
        'Phasenname ist erforderlich'
      );
    });

    it('should throw ValidationError when bereich is invalid', () => {
      const invalidProps = {
        ...validProps,
        bereich: 'invalid' as PhaseBereich,
      };

      expect(() => ProjectPhase.create(invalidProps)).toThrow(ValidationError);
      expect(() => ProjectPhase.create(invalidProps)).toThrow('Ungültiger Bereich');
    });

    it('should trim whitespace from name', () => {
      const propsWithWhitespace: CreateProjectPhaseProps = {
        ...validProps,
        name: '  Elementierung  ',
      };

      const phase = ProjectPhase.create(propsWithWhitespace);

      expect(phase.name).toBe('Elementierung');
    });
  });

  describe('Stunden-Berechnungen', () => {
    it('should calculate utilization percentage', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        budgetHours: 40,
        plannedHours: 35,
        actualHours: 28,
      });

      expect(phase.utilizationPercent).toBe(70); // 28/40 * 100
    });

    it('should calculate delta (IST - SOLL)', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        budgetHours: 40,
        actualHours: 28,
      });

      expect(phase.delta).toBe(-12); // 28 - 40
    });

    it('should return null utilization when no budget', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        budgetHours: undefined,
        actualHours: 10,
      });

      expect(phase.utilizationPercent).toBeNull();
    });

    it('should return null utilization when budget is 0', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        budgetHours: 0,
        actualHours: 10,
      });

      expect(phase.utilizationPercent).toBeNull();
    });

    it('should return null delta when no budget', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        budgetHours: undefined,
        actualHours: 10,
      });

      expect(phase.delta).toBeNull();
    });

    it('should detect over-budget', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        budgetHours: 40,
        actualHours: 45,
      });

      expect(phase.isOverBudget).toBe(true);
      expect(phase.delta).toBe(5);
    });

    it('should detect not over-budget', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        budgetHours: 40,
        actualHours: 35,
      });

      expect(phase.isOverBudget).toBe(false);
    });

    it('should detect over-planned', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        budgetHours: 40,
        plannedHours: 50,
      });

      expect(phase.isOverPlanned).toBe(true);
    });

    it('should detect not over-planned', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        budgetHours: 40,
        plannedHours: 35,
      });

      expect(phase.isOverPlanned).toBe(false);
    });

    it('should return false for isOverBudget when no budget', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        budgetHours: undefined,
        actualHours: 100,
      });

      expect(phase.isOverBudget).toBe(false);
    });

    it('should return false for isOverPlanned when no budget', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        budgetHours: undefined,
        plannedHours: 100,
      });

      expect(phase.isOverPlanned).toBe(false);
    });

    it('should round utilization to nearest integer', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        budgetHours: 30,
        actualHours: 20, // 66.666...%
      });

      expect(phase.utilizationPercent).toBe(67);
    });
  });

  describe('Soft Delete', () => {
    it('should detect deleted status', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        status: 'deleted',
      });

      expect(phase.isDeleted).toBe(true);
    });

    it('should detect deleted by deletedAt', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        status: 'active',
        deletedAt: new Date(),
      });

      expect(phase.isDeleted).toBe(true);
    });

    it('should detect active phase', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        status: 'active',
        deletedAt: undefined,
      });

      expect(phase.isDeleted).toBe(false);
    });
  });

  describe('withStatus', () => {
    it('should change status and return new instance', () => {
      const phase = ProjectPhase.create(validProps);

      const deletedPhase = phase.withStatus('deleted');

      expect(deletedPhase).not.toBe(phase); // Immutability
      expect(deletedPhase.status).toBe('deleted');
      expect(phase.status).toBe('active'); // Original unchanged
    });

    it('should set deletedAt when status is deleted', () => {
      const phase = ProjectPhase.create(validProps);

      const deletedPhase = phase.withStatus('deleted');

      expect(deletedPhase.deletedAt).toBeDefined();
      expect(deletedPhase.isDeleted).toBe(true);
    });

    it('should clear deletedAt when status is active', () => {
      const deletedPhase = ProjectPhase.create({
        ...validProps,
        status: 'deleted',
        deletedAt: new Date(),
      });

      const activePhase = deletedPhase.withStatus('active');

      expect(activePhase.deletedAt).toBeUndefined();
      expect(activePhase.isDeleted).toBe(false);
    });

    it('should throw ValidationError for invalid status', () => {
      const phase = ProjectPhase.create(validProps);

      expect(() => phase.withStatus('invalid' as PhaseStatus)).toThrow(
        ValidationError
      );
    });
  });

  describe('withDates', () => {
    it('should update dates and return new instance', () => {
      const phase = ProjectPhase.create(validProps);
      const startDate = new Date('2026-02-01');
      const endDate = new Date('2026-03-15');

      const updatedPhase = phase.withDates(startDate, endDate);

      expect(updatedPhase).not.toBe(phase); // Immutability
      expect(updatedPhase.startDate).toEqual(startDate);
      expect(updatedPhase.endDate).toEqual(endDate);
    });

    it('should throw ValidationError when endDate is before startDate', () => {
      const phase = ProjectPhase.create(validProps);
      const startDate = new Date('2026-03-15');
      const endDate = new Date('2026-02-01');

      expect(() => phase.withDates(startDate, endDate)).toThrow(ValidationError);
      expect(() => phase.withDates(startDate, endDate)).toThrow(
        'Enddatum muss nach Startdatum liegen'
      );
    });
  });

  describe('withBudgetHours', () => {
    it('should update budget hours and return new instance', () => {
      const phase = ProjectPhase.create(validProps);

      const updatedPhase = phase.withBudgetHours(50);

      expect(updatedPhase).not.toBe(phase); // Immutability
      expect(updatedPhase.budgetHours).toBe(50);
      expect(phase.budgetHours).toBeUndefined(); // Original unchanged
    });

    it('should throw ValidationError for negative budget hours', () => {
      const phase = ProjectPhase.create(validProps);

      expect(() => phase.withBudgetHours(-10)).toThrow(ValidationError);
      expect(() => phase.withBudgetHours(-10)).toThrow(
        'Budget-Stunden dürfen nicht negativ sein'
      );
    });

    it('should allow setting budget to undefined', () => {
      const phase = ProjectPhase.create({
        ...validProps,
        budgetHours: 40,
      });

      const updatedPhase = phase.withBudgetHours(undefined);

      expect(updatedPhase.budgetHours).toBeUndefined();
    });
  });
});
