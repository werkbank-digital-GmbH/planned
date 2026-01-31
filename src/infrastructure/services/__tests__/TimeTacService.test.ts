import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TimeTacService } from '../TimeTacService';

describe('TimeTacService', () => {
  let service: TimeTacService;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    service = new TimeTacService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // API KEY VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('validateApiKey', () => {
    it('should return true for valid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1, name: 'Test Account' } }),
      });

      const isValid = await service.validateApiKey('valid-key');

      expect(isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/account'),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer valid-key',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should return false for invalid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const isValid = await service.validateApiKey('invalid-key');

      expect(isValid).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCOUNT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getAccount', () => {
    it('should fetch account info', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { id: 123, name: 'Mustermann Holzbau' },
          }),
      });

      const account = await service.getAccount('api-key');

      expect(account.id).toBe(123);
      expect(account.name).toBe('Mustermann Holzbau');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getUsers', () => {
    it('should fetch users', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 1,
                username: 'mmustermann',
                firstname: 'Max',
                lastname: 'Mustermann',
                email: 'max@example.com',
                active: true,
              },
              {
                id: 2,
                username: 'aschmidt',
                firstname: 'Anna',
                lastname: 'Schmidt',
                email: 'anna@example.com',
                active: true,
              },
            ],
          }),
      });

      const users = await service.getUsers('api-key');

      expect(users).toHaveLength(2);
      expect(users[0].firstname).toBe('Max');
      expect(users[1].lastname).toBe('Schmidt');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ABSENCE TYPES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getAbsenceTypes', () => {
    it('should fetch absence types', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { id: 1, name: 'Urlaub' },
              { id: 2, name: 'Krank' },
              { id: 3, name: 'Feiertag' },
            ],
          }),
      });

      const types = await service.getAbsenceTypes('api-key');

      expect(types).toHaveLength(3);
      expect(types[0].name).toBe('Urlaub');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ABSENCES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getAbsences', () => {
    it('should fetch absences for date range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 1,
                user_id: 1,
                absence_type_id: 1,
                date_from: '2026-02-02',
                date_to: '2026-02-06',
                hours: 40,
                approved: true,
              },
            ],
          }),
      });

      const absences = await service.getAbsences(
        'api-key',
        new Date('2026-02-01'),
        new Date('2026-02-28')
      );

      expect(absences).toHaveLength(1);
      expect(absences[0].date_from).toBe('2026-02-02');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('date_from=2026-02-01'),
        expect.any(Object)
      );
    });

    it('should filter by user if specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await service.getAbsences(
        'api-key',
        new Date('2026-02-01'),
        new Date('2026-02-28'),
        123
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('user_id=123'),
        expect.any(Object)
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIME ENTRIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getTimeEntries', () => {
    it('should fetch time entries for date range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 1,
                user_id: 1,
                date: '2026-02-03',
                duration_hours: 8.5,
                note: 'Produktion Haus Weber',
              },
            ],
          }),
      });

      const entries = await service.getTimeEntries(
        'api-key',
        new Date('2026-02-01'),
        new Date('2026-02-07')
      );

      expect(entries).toHaveLength(1);
      expect(entries[0].duration_hours).toBe(8.5);
    });

    it('should filter by user if specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await service.getTimeEntries(
        'api-key',
        new Date('2026-02-01'),
        new Date('2026-02-07'),
        456
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('user_id=456'),
        expect.any(Object)
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('error handling', () => {
    it('should throw TIMETAC_INVALID_API_KEY on 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(service.getUsers('invalid-key')).rejects.toThrow(
        'TIMETAC_INVALID_API_KEY'
      );
    });

    it('should throw generic error on other failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.getUsers('key')).rejects.toThrow('TimeTac API Fehler');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MAPPING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('mapAbsenceType', () => {
    const config = {
      absenceTypeMapping: {
        1: 'urlaub' as const,
        2: 'krank' as const,
        3: 'feiertag' as const,
      },
    };

    it('should map known absence types', () => {
      expect(service.mapAbsenceType(1, config)).toBe('urlaub');
      expect(service.mapAbsenceType(2, config)).toBe('krank');
      expect(service.mapAbsenceType(3, config)).toBe('feiertag');
    });

    it('should return sonstiges for unknown types', () => {
      expect(service.mapAbsenceType(99, config)).toBe('sonstiges');
    });
  });
});
