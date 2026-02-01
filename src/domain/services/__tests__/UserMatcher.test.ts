import { describe, it, expect } from 'vitest';

import {
  matchUsersByEmailPrefix,
  type PlannedUserForMatching,
  type AsanaUserForMatching,
} from '../UserMatcher';

describe('UserMatcher', () => {
  describe('matchUsersByEmailPrefix', () => {
    it('should match users with identical email prefixes', () => {
      const plannedUsers: PlannedUserForMatching[] = [
        { id: 'user-1', email: 'max.mustermann@holzbau.de' },
      ];

      const asanaUsers: AsanaUserForMatching[] = [
        { gid: 'asana-1', email: 'max.mustermann@holzbau.com', name: 'Max Mustermann' },
      ];

      const result = matchUsersByEmailPrefix(plannedUsers, asanaUsers);

      expect(result.matched).toHaveLength(1);
      expect(result.matched[0]).toEqual({
        plannedUserId: 'user-1',
        plannedUserEmail: 'max.mustermann@holzbau.de',
        asanaUserGid: 'asana-1',
        asanaUserEmail: 'max.mustermann@holzbau.com',
        asanaUserName: 'Max Mustermann',
      });
      expect(result.unmatchedPlanned).toHaveLength(0);
      expect(result.unmatchedAsana).toHaveLength(0);
    });

    it('should match users case-insensitively', () => {
      const plannedUsers: PlannedUserForMatching[] = [
        { id: 'user-1', email: 'Max.Mustermann@holzbau.de' },
      ];

      const asanaUsers: AsanaUserForMatching[] = [
        { gid: 'asana-1', email: 'max.mustermann@holzbau.com', name: 'Max' },
      ];

      const result = matchUsersByEmailPrefix(plannedUsers, asanaUsers);

      expect(result.matched).toHaveLength(1);
      expect(result.matched[0].plannedUserId).toBe('user-1');
      expect(result.matched[0].asanaUserGid).toBe('asana-1');
    });

    it('should handle unmatched planned users', () => {
      const plannedUsers: PlannedUserForMatching[] = [
        { id: 'user-1', email: 'max@example.de' },
        { id: 'user-2', email: 'unknown@example.de' },
      ];

      const asanaUsers: AsanaUserForMatching[] = [
        { gid: 'asana-1', email: 'max@example.com', name: 'Max' },
      ];

      const result = matchUsersByEmailPrefix(plannedUsers, asanaUsers);

      expect(result.matched).toHaveLength(1);
      expect(result.unmatchedPlanned).toHaveLength(1);
      expect(result.unmatchedPlanned[0].id).toBe('user-2');
    });

    it('should handle unmatched asana users', () => {
      const plannedUsers: PlannedUserForMatching[] = [
        { id: 'user-1', email: 'max@example.de' },
      ];

      const asanaUsers: AsanaUserForMatching[] = [
        { gid: 'asana-1', email: 'max@example.com', name: 'Max' },
        { gid: 'asana-2', email: 'unknown@asana.com', name: 'Unknown' },
      ];

      const result = matchUsersByEmailPrefix(plannedUsers, asanaUsers);

      expect(result.matched).toHaveLength(1);
      expect(result.unmatchedAsana).toHaveLength(1);
      expect(result.unmatchedAsana[0].gid).toBe('asana-2');
    });

    it('should handle empty lists', () => {
      const result = matchUsersByEmailPrefix([], []);

      expect(result.matched).toHaveLength(0);
      expect(result.unmatchedPlanned).toHaveLength(0);
      expect(result.unmatchedAsana).toHaveLength(0);
    });

    it('should match multiple users correctly', () => {
      const plannedUsers: PlannedUserForMatching[] = [
        { id: 'user-1', email: 'a.meier@company.de' },
        { id: 'user-2', email: 'b.schmidt@company.de' },
        { id: 'user-3', email: 'c.mueller@company.de' },
      ];

      const asanaUsers: AsanaUserForMatching[] = [
        { gid: 'asana-1', email: 'a.meier@asana.com', name: 'A. Meier' },
        { gid: 'asana-2', email: 'b.schmidt@asana.com', name: 'B. Schmidt' },
        { gid: 'asana-4', email: 'd.weber@asana.com', name: 'D. Weber' },
      ];

      const result = matchUsersByEmailPrefix(plannedUsers, asanaUsers);

      expect(result.matched).toHaveLength(2);
      expect(result.unmatchedPlanned).toHaveLength(1);
      expect(result.unmatchedPlanned[0].id).toBe('user-3');
      expect(result.unmatchedAsana).toHaveLength(1);
      expect(result.unmatchedAsana[0].gid).toBe('asana-4');
    });

    it('should handle emails without @ symbol', () => {
      const plannedUsers: PlannedUserForMatching[] = [
        { id: 'user-1', email: 'invalid-email' },
      ];

      const asanaUsers: AsanaUserForMatching[] = [
        { gid: 'asana-1', email: 'invalid-email', name: 'Invalid' },
      ];

      const result = matchUsersByEmailPrefix(plannedUsers, asanaUsers);

      // Should still match based on the whole string as prefix
      expect(result.matched).toHaveLength(1);
    });

    it('should handle asana users with empty emails', () => {
      const plannedUsers: PlannedUserForMatching[] = [
        { id: 'user-1', email: 'test@example.com' },
      ];

      const asanaUsers: AsanaUserForMatching[] = [
        { gid: 'asana-1', email: '', name: 'No Email' },
        { gid: 'asana-2', email: 'test@asana.com', name: 'Test' },
      ];

      const result = matchUsersByEmailPrefix(plannedUsers, asanaUsers);

      expect(result.matched).toHaveLength(1);
      expect(result.matched[0].asanaUserGid).toBe('asana-2');
      expect(result.unmatchedAsana).toHaveLength(1);
      expect(result.unmatchedAsana[0].gid).toBe('asana-1');
    });
  });
});
