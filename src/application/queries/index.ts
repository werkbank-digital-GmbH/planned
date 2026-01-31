export { GetAllocationsForWeekQuery } from './GetAllocationsForWeekQuery';
export type {
  GetAllocationsForWeekRequest,
  WeekAllocationData,
  WeekProjectData,
  DayData,
  AllocationWithDetails,
  WeekSummary,
  UserSummary,
  ResourceSummary,
  ProjectPhaseSummary,
  ProjectSummary,
  // Project-centric types
  ProjectRowData,
  PhaseRowData,
  PoolItem,
  DayAvailability,
  AvailabilityStatus,
} from './GetAllocationsForWeekQuery';

export { GetDashboardDataQuery } from './GetDashboardDataQuery';
export type {
  GetDashboardDataRequest,
  DashboardData,
  DayUtilization,
  TeamCapacityMetrics,
  DashboardProjectSummary,
  AbsenceSummary,
} from './GetDashboardDataQuery';

export { GetProjectPhaseSummaryQuery } from './GetProjectPhaseSummaryQuery';
export type {
  GetProjectPhaseSummaryRequest,
  PhaseSummaryData,
} from './GetProjectPhaseSummaryQuery';

export { GetMyWeekQuery } from './GetMyWeekQuery';
export type {
  GetMyWeekRequest,
  MyWeekData,
  MyWeekDay,
  MyAllocation,
  AbsenceType,
} from './GetMyWeekQuery';
