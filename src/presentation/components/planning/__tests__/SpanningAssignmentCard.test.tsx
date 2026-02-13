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
import { SpanningAssignmentCard } from '../SpanningAssignmentCard';
// eslint-disable-next-line import/first -- Import must be after vi.mock
import type { AllocationSpan } from '../utils/allocation-grouping';

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

const createMockUser = () => ({
  id: 'user-1',
  fullName: 'Max Müller',
  weeklyHours: 40,
  dailyCapacity: 8,
});

const createMockAllocation = (id: string, date: Date) => ({
  id,
  tenantId: 'tenant-1',
  date,
  plannedHours: 8,
  actualHours: 0,
  hasAbsenceConflict: false,
  user: createMockUser(),
  resource: undefined,
  projectPhase: { id: 'phase-1', name: 'Produktion', bereich: 'produktion' },
  project: { id: 'project-1', name: 'Test Project' },
  notes: undefined,
  absenceType: undefined,
});

const createMockSpan = (overrides: Partial<AllocationSpan> = {}): AllocationSpan => ({
  allocations: [
    createMockAllocation('alloc-1', new Date('2025-01-27')),
    createMockAllocation('alloc-2', new Date('2025-01-28')),
    createMockAllocation('alloc-3', new Date('2025-01-29')),
  ] as AllocationSpan['allocations'],
  userId: 'user-1',
  resourceId: undefined,
  phaseId: 'phase-1',
  startDate: new Date('2025-01-27'),
  endDate: new Date('2025-01-29'),
  startDayIndex: 0,
  spanDays: 3,
  totalHours: 24,
  displayName: 'M. Müller',
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('SpanningAssignmentCard', () => {
  describe('rendering', () => {
    it('should render the display name', () => {
      const span = createMockSpan();
      render(<SpanningAssignmentCard span={span} />);
      expect(screen.getByText('M. Müller')).toBeInTheDocument();
    });

    it('should render span label for 3 days', () => {
      const span = createMockSpan({ spanDays: 3 });
      render(<SpanningAssignmentCard span={span} />);
      expect(screen.getByText('3 Tage')).toBeInTheDocument();
    });

    it('should render span label for 4 days', () => {
      const span = createMockSpan({ spanDays: 4 });
      render(<SpanningAssignmentCard span={span} />);
      expect(screen.getByText('4 Tage')).toBeInTheDocument();
    });

    it('should render Mo-Fr for 5 day span', () => {
      const span = createMockSpan({ spanDays: 5 });
      render(<SpanningAssignmentCard span={span} />);
      expect(screen.getByText('Mo-Fr')).toBeInTheDocument();
    });

    it('should render span label for 2 days', () => {
      const span = createMockSpan({ spanDays: 2 });
      render(<SpanningAssignmentCard span={span} />);
      expect(screen.getByText('2 Tage')).toBeInTheDocument();
    });

    it('should not render span label for 1 day', () => {
      const span = createMockSpan({ spanDays: 1 });
      render(<SpanningAssignmentCard span={span} />);
      // No "Tage" label should appear for single day
      expect(screen.queryByText(/Tage/)).not.toBeInTheDocument();
      expect(screen.queryByText('Mo-Fr')).not.toBeInTheDocument();
    });
  });

  describe('user vs resource styling', () => {
    it('should have blue styling for user allocation', () => {
      const span = createMockSpan({ userId: 'user-1', resourceId: undefined });
      const { container } = render(<SpanningAssignmentCard span={span} />);
      const card = container.querySelector('[class*="bg-blue"]');
      expect(card).toBeInTheDocument();
    });

    it('should have orange styling for resource allocation', () => {
      const resourceSpan = createMockSpan({
        userId: undefined,
        resourceId: 'res-1',
        displayName: 'Kran 1',
        allocations: [
          {
            id: 'alloc-1',
            tenantId: 'tenant-1',
            date: new Date('2025-01-27'),
            plannedHours: undefined,
            actualHours: 0,
            hasAbsenceConflict: false,
            user: undefined,
            resource: { id: 'res-1', name: 'Kran 1' },
            projectPhase: { id: 'phase-1', name: 'Montage', bereich: 'montage' },
            project: { id: 'project-1', name: 'Test Project' },
            notes: undefined,
            absenceType: undefined,
          },
        ] as AllocationSpan['allocations'],
      });
      const { container } = render(<SpanningAssignmentCard span={resourceSpan} />);
      const card = container.querySelector('[class*="bg-orange"]');
      expect(card).toBeInTheDocument();
    });

    it('should show User icon for user allocation', () => {
      const span = createMockSpan({ userId: 'user-1', resourceId: undefined });
      const { container } = render(<SpanningAssignmentCard span={span} />);
      // User icon is rendered (lucide-react User component)
      const svgIcon = container.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    });

    it('should show Truck icon for resource allocation', () => {
      const resourceSpan = createMockSpan({
        userId: undefined,
        resourceId: 'res-1',
        displayName: 'Kran 1',
        allocations: [
          {
            id: 'alloc-1',
            tenantId: 'tenant-1',
            date: new Date('2025-01-27'),
            plannedHours: undefined,
            actualHours: 0,
            hasAbsenceConflict: false,
            user: undefined,
            resource: { id: 'res-1', name: 'Kran 1' },
            projectPhase: { id: 'phase-1', name: 'Montage', bereich: 'montage' },
            project: { id: 'project-1', name: 'Test Project' },
            notes: undefined,
            absenceType: undefined,
          },
        ] as AllocationSpan['allocations'],
      });
      const { container } = render(<SpanningAssignmentCard span={resourceSpan} />);
      const svgIcon = container.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    });
  });

  describe('display name variations', () => {
    it('should render the display name', () => {
      const span = createMockSpan({ displayName: 'T. Schmidt' });
      render(<SpanningAssignmentCard span={span} />);
      expect(screen.getByText('T. Schmidt')).toBeInTheDocument();
    });

    it('should render resource name for resource span', () => {
      const resourceSpan = createMockSpan({
        userId: undefined,
        resourceId: 'res-1',
        displayName: 'Kran 1',
      });
      render(<SpanningAssignmentCard span={resourceSpan} />);
      expect(screen.getByText('Kran 1')).toBeInTheDocument();
    });
  });

  describe('drag data', () => {
    it('should set up draggable with correct id', async () => {
      const { useDraggable } = await import('@dnd-kit/core');
      const span = createMockSpan();
      render(<SpanningAssignmentCard span={span} />);

      expect(useDraggable).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'allocation-span-alloc-1',
        })
      );
    });

    it('should pass correct drag data for user span', async () => {
      const { useDraggable } = await import('@dnd-kit/core');
      const span = createMockSpan({
        userId: 'user-1',
        resourceId: undefined,
        phaseId: 'phase-1',
        spanDays: 3,
        startDayIndex: 0,
      });
      render(<SpanningAssignmentCard span={span} />);

      expect(useDraggable).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'allocation-span',
            userId: 'user-1',
            resourceId: undefined,
            phaseId: 'phase-1',
            spanDays: 3,
            startDayIndex: 0,
          }),
        })
      );
    });

    it('should pass allocation ids in drag data', async () => {
      const { useDraggable } = await import('@dnd-kit/core');
      const span = createMockSpan();
      render(<SpanningAssignmentCard span={span} />);

      expect(useDraggable).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            allocationIds: ['alloc-1', 'alloc-2', 'alloc-3'],
          }),
        })
      );
    });
  });
});
