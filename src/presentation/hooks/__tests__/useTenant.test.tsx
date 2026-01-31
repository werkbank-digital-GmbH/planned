import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useTenant } from '../useTenant';

// Mock Supabase Client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/infrastructure/supabase/client', () => ({
  createBrowserSupabaseClient: () => mockSupabaseClient,
}));

describe('useTenant', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  it('should return null when user is not logged in', async () => {
    // Arrange
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    // Act
    const { result } = renderHook(() => useTenant(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.tenant).toBeNull();
  });

  it('should return tenant context when user is logged in', async () => {
    // Arrange
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'auth-123' },
      },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              tenant: {
                id: 'tenant-123',
                name: 'Zimmerei Müller GmbH',
                slug: 'zimmerei-mueller',
              },
            },
            error: null,
          }),
        }),
      }),
    });

    // Act
    const { result } = renderHook(() => useTenant(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.tenant).toEqual({
      id: 'tenant-123',
      name: 'Zimmerei Müller GmbH',
      slug: 'zimmerei-mueller',
    });
  });

  it('should return null when user has no tenant assigned', async () => {
    // Arrange
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'auth-123' },
      },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'No rows found' },
          }),
        }),
      }),
    });

    // Act
    const { result } = renderHook(() => useTenant(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.tenant).toBeNull();
  });

  it('should expose loading state', async () => {
    // Arrange
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    // Act
    const { result } = renderHook(() => useTenant(), { wrapper });

    // Assert - initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should expose error state', async () => {
    // Arrange
    mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Auth error'));

    // Act
    const { result } = renderHook(() => useTenant(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toBeDefined();
  });
});
