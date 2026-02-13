import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock @dnd-kit/core - must be before component import
vi.mock('@dnd-kit/core', () => ({
  useDraggable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  })),
}));

// Mock ResizeActionsContext - must be before component import
vi.mock('@/presentation/contexts/ResizeActionsContext', () => ({
  useResizeActions: vi.fn(() => ({
    weekStart: new Date('2025-01-27'),
    addAllocationOptimistic: vi.fn(),
    removeAllocationOptimistic: vi.fn(),
    replaceAllocationId: vi.fn(),
  })),
}));

// eslint-disable-next-line import/first -- Import must be after vi.mock
import type { AllocationWithDetails } from '@/application/queries';

// eslint-disable-next-line import/first -- Import must be after vi.mock
import { AssignmentCard } from '../AssignmentCard';

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

const createMockUser = (overrides: Partial<{ id: string; fullName: string }> = {}) => ({
  id: 'user-1',
  fullName: 'Max Bauer',
  weeklyHours: 40,
  dailyCapacity: 8,
  ...overrides,
});

const createMockAllocation = (
  overrides: Partial<AllocationWithDetails> = {}
): AllocationWithDetails => ({
  id: 'alloc-1',
  tenantId: 'tenant-1',
  date: new Date('2025-01-30'),
  plannedHours: 8,
  actualHours: 0,
  hasAbsenceConflict: false,
  user: createMockUser(),
  resource: undefined,
  projectPhase: { id: 'phase-1', name: 'Produktion', bereich: 'produktion' },
  project: { id: 'project-1', name: 'Test Project' },
  notes: undefined,
  absenceType: undefined,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('AssignmentCard', () => {
  describe('name formatting', () => {
    it('should format user name with initial and last name', () => {
      const allocation = createMockAllocation({
        user: createMockUser({ id: 'user-1', fullName: 'Max Bauer' }),
      });
      render(<AssignmentCard allocation={allocation} />);
      expect(screen.getByText('M.Bauer')).toBeInTheDocument();
    });

    it('should format multi-part name correctly', () => {
      const allocation = createMockAllocation({
        user: createMockUser({ id: 'user-1', fullName: 'Anna Maria Schmidt' }),
      });
      render(<AssignmentCard allocation={allocation} />);
      expect(screen.getByText('A.Schmidt')).toBeInTheDocument();
    });

    it('should display single name as-is', () => {
      const allocation = createMockAllocation({
        user: createMockUser({ id: 'user-1', fullName: 'Admin' }),
      });
      render(<AssignmentCard allocation={allocation} />);
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should display resource name without formatting', () => {
      const allocation = createMockAllocation({
        user: undefined,
        resource: { id: 'res-1', name: 'Kran 1' },
      });
      render(<AssignmentCard allocation={allocation} />);
      expect(screen.getByText('Kran 1')).toBeInTheDocument();
    });

    it('should display Unbekannt when no user or resource', () => {
      const allocation = createMockAllocation({
        user: undefined,
        resource: undefined,
      });
      render(<AssignmentCard allocation={allocation} />);
      expect(screen.getByText('Unbekannt')).toBeInTheDocument();
    });
  });

  describe('user vs resource styling', () => {
    it('should have blue styling for user allocation', () => {
      const allocation = createMockAllocation({
        user: createMockUser({ id: 'user-1', fullName: 'Max Müller' }),
        resource: undefined,
      });
      const { container } = render(<AssignmentCard allocation={allocation} />);
      const card = container.querySelector('[class*="bg-blue"]');
      expect(card).toBeInTheDocument();
    });

    it('should have orange styling for resource allocation', () => {
      const allocation = createMockAllocation({
        user: undefined,
        resource: { id: 'res-1', name: 'Kran 1' },
      });
      const { container } = render(<AssignmentCard allocation={allocation} />);
      const card = container.querySelector('[class*="bg-orange"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('absence conflict', () => {
    it('should show AlertCircle icon when hasAbsenceConflict is true', () => {
      const allocation = createMockAllocation({
        hasAbsenceConflict: true,
        absenceType: 'vacation',
      });
      const { container } = render(<AssignmentCard allocation={allocation} />);
      // AlertCircle icon should be present as subtle conflict indicator
      const alertIcon = container.querySelector('svg.text-red-500');
      expect(alertIcon).toBeInTheDocument();
    });

    it('should not show AlertCircle icon when hasAbsenceConflict is false', () => {
      const allocation = createMockAllocation({
        hasAbsenceConflict: false,
      });
      const { container } = render(<AssignmentCard allocation={allocation} />);
      const alertIcon = container.querySelector('svg.text-red-500');
      expect(alertIcon).not.toBeInTheDocument();
    });

    it('should not apply red ring styling for conflicts', () => {
      const allocation = createMockAllocation({
        hasAbsenceConflict: true,
        absenceType: 'vacation',
      });
      const { container } = render(<AssignmentCard allocation={allocation} />);
      // Red ring was removed — only AlertCircle icon remains as indicator
      const ringElement = container.querySelector('[class*="ring-red"]');
      expect(ringElement).not.toBeInTheDocument();
    });
  });

  describe('full-width mode', () => {
    it('should always render with full width (w-full)', () => {
      const allocation = createMockAllocation();
      const { container } = render(<AssignmentCard allocation={allocation} />);
      const card = container.querySelector('[class*="w-full"]');
      expect(card).toBeInTheDocument();
    });

    it('should not have max-w constraint', () => {
      const allocation = createMockAllocation();
      const { container } = render(<AssignmentCard allocation={allocation} />);
      const card = container.querySelector('[class*="max-w-[80px]"]');
      expect(card).not.toBeInTheDocument();
      // Card should still render with blue background for user
      expect(container.querySelector('[class*="bg-blue"]')).toBeInTheDocument();
    });
  });

  describe('conditional rendering', () => {
    it('should render card with plannedHours', () => {
      const allocation = createMockAllocation({
        plannedHours: 8,
      });
      const { container } = render(<AssignmentCard allocation={allocation} />);
      // Card should be rendered
      expect(container.querySelector('[class*="bg-blue"]')).toBeInTheDocument();
    });

    it('should render card with notes', () => {
      const allocation = createMockAllocation({
        plannedHours: undefined,
        notes: 'Test-Notiz',
      });
      const { container } = render(<AssignmentCard allocation={allocation} />);
      expect(container.querySelector('[class*="bg-blue"]')).toBeInTheDocument();
    });

    it('should render card with conflict (AlertCircle icon)', () => {
      const allocation = createMockAllocation({
        plannedHours: undefined,
        hasAbsenceConflict: true,
        absenceType: 'vacation',
      });
      const { container } = render(<AssignmentCard allocation={allocation} />);
      expect(container.querySelector('svg.text-red-500')).toBeInTheDocument();
    });

    it('should render card without extra info', () => {
      const allocation = createMockAllocation({
        plannedHours: undefined,
        notes: undefined,
        hasAbsenceConflict: false,
      });
      const { container } = render(<AssignmentCard allocation={allocation} />);
      expect(container.querySelector('[class*="bg-blue"]')).toBeInTheDocument();
    });
  });

  describe('drag data', () => {
    it('should set up draggable with correct id', async () => {
      const { useDraggable } = await import('@dnd-kit/core');
      const allocation = createMockAllocation({ id: 'alloc-123' });
      render(<AssignmentCard allocation={allocation} />);

      expect(useDraggable).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'allocation-alloc-123',
        })
      );
    });

    it('should pass correct drag data for user allocation', async () => {
      const { useDraggable } = await import('@dnd-kit/core');
      const allocation = createMockAllocation({
        id: 'alloc-1',
        user: createMockUser({ id: 'user-1', fullName: 'Max' }),
        resource: undefined,
        projectPhase: { id: 'phase-1', name: 'Test', bereich: 'produktion' },
      });
      render(<AssignmentCard allocation={allocation} />);

      expect(useDraggable).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'allocation',
            allocationId: 'alloc-1',
            sourceUserId: 'user-1',
            sourceResourceId: undefined,
            projectPhaseId: 'phase-1',
          }),
        })
      );
    });

    it('should pass correct drag data for resource allocation', async () => {
      const { useDraggable } = await import('@dnd-kit/core');
      const allocation = createMockAllocation({
        id: 'alloc-2',
        user: undefined,
        resource: { id: 'res-1', name: 'Kran' },
        projectPhase: { id: 'phase-2', name: 'Montage', bereich: 'montage' },
      });
      render(<AssignmentCard allocation={allocation} />);

      expect(useDraggable).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'allocation',
            allocationId: 'alloc-2',
            sourceUserId: undefined,
            sourceResourceId: 'res-1',
            projectPhaseId: 'phase-2',
          }),
        })
      );
    });
  });
});
