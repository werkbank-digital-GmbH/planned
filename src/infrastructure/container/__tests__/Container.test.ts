import { describe, it, expect, beforeEach, vi } from 'vitest';

import { Container, TOKENS } from '../index';

describe('DI Container', () => {
  let container: Container;

  beforeEach(() => {
    container = Container.getInstance();
    container.reset();
  });

  describe('Singleton Pattern', () => {
    it('should be a singleton', () => {
      const instance1 = Container.getInstance();
      const instance2 = Container.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return same instance after reset', () => {
      const instance1 = Container.getInstance();
      instance1.reset();
      const instance2 = Container.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Registration and Resolution', () => {
    it('should register and resolve dependencies', () => {
      const mockRepo = { findById: vi.fn() };
      container.register(TOKENS.UserRepository, () => mockRepo);

      const resolved = container.resolve(TOKENS.UserRepository);
      expect(resolved).toBe(mockRepo);
    });

    it('should throw when resolving unregistered token', () => {
      expect(() => container.resolve(Symbol('unknown'))).toThrow(
        'No registration found'
      );
    });

    it('should call factory on each resolution (transient)', () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { count: callCount };
      };

      container.register(TOKENS.ProjectRepository, factory);

      const first = container.resolve(TOKENS.ProjectRepository);
      const second = container.resolve(TOKENS.ProjectRepository);

      expect(callCount).toBe(2);
      expect(first).not.toBe(second);
    });

    it('should support singleton registration', () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { count: callCount };
      };

      container.registerSingleton(TOKENS.AllocationRepository, factory);

      const first = container.resolve(TOKENS.AllocationRepository);
      const second = container.resolve(TOKENS.AllocationRepository);

      expect(callCount).toBe(1);
      expect(first).toBe(second);
    });

    it('should allow overwriting registrations', () => {
      container.register(TOKENS.UserRepository, () => ({ type: 'first' }));
      container.register(TOKENS.UserRepository, () => ({ type: 'second' }));

      const resolved = container.resolve<{ type: string }>(TOKENS.UserRepository);
      expect(resolved.type).toBe('second');
    });
  });

  describe('Reset', () => {
    it('should clear all registrations on reset', () => {
      container.register(TOKENS.UserRepository, () => ({}));
      container.reset();

      expect(() => container.resolve(TOKENS.UserRepository)).toThrow(
        'No registration found'
      );
    });

    it('should clear singleton instances on reset', () => {
      let callCount = 0;
      container.registerSingleton(TOKENS.AllocationRepository, () => {
        callCount++;
        return {};
      });

      container.resolve(TOKENS.AllocationRepository);
      container.reset();

      // Re-register after reset
      container.registerSingleton(TOKENS.AllocationRepository, () => {
        callCount++;
        return {};
      });

      container.resolve(TOKENS.AllocationRepository);
      expect(callCount).toBe(2);
    });
  });

  describe('TOKENS', () => {
    it('should have all required repository tokens', () => {
      expect(TOKENS.UserRepository).toBeDefined();
      expect(TOKENS.ProjectRepository).toBeDefined();
      expect(TOKENS.ProjectPhaseRepository).toBeDefined();
      expect(TOKENS.AllocationRepository).toBeDefined();
      expect(TOKENS.ResourceRepository).toBeDefined();
      expect(TOKENS.ResourceTypeRepository).toBeDefined();
      expect(TOKENS.AbsenceRepository).toBeDefined();
      expect(TOKENS.TimeEntryRepository).toBeDefined();
      expect(TOKENS.TenantRepository).toBeDefined();
      expect(TOKENS.SyncLogRepository).toBeDefined();
      expect(TOKENS.IntegrationCredentialsRepository).toBeDefined();
    });

    it('should have all required service tokens', () => {
      expect(TOKENS.AsanaService).toBeDefined();
      expect(TOKENS.TimeTacService).toBeDefined();
      expect(TOKENS.EncryptionService).toBeDefined();
    });

    it('should have unique tokens', () => {
      const tokenValues = Object.values(TOKENS);
      const uniqueTokens = new Set(tokenValues);
      expect(tokenValues.length).toBe(uniqueTokens.size);
    });
  });
});
