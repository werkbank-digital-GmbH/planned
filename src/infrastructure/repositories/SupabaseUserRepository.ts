import type { SupabaseClient } from '@supabase/supabase-js';

import { User, type CreateUserProps } from '@/domain/entities/User';
import type { UserRole } from '@/domain/types';

import type { IUserRepository, UserWithTenant } from '@/application/ports/repositories';

import type { Database } from '@/lib/database.types';

type DbUser = Database['public']['Tables']['users']['Row'];
type DbTenant = Database['public']['Tables']['tenants']['Row'];

/**
 * Supabase-Implementierung des IUserRepository.
 *
 * Mappt zwischen Domain-Entities und Datenbank-Rows.
 */
export class SupabaseUserRepository implements IUserRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>
  ) {}

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToEntity(data);
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .in('id', ids);

    if (error || !data) {
      return [];
    }

    return data.map((row) => this.mapToEntity(row));
  }

  async findByAuthId(authId: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToEntity(data);
  }

  async findByAuthIdWithTenant(authId: string): Promise<UserWithTenant | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select(`
        id,
        auth_id,
        email,
        full_name,
        role,
        weekly_hours,
        is_active,
        avatar_url,
        tenant:tenants!inner(
          id,
          name,
          slug
        )
      `)
      .eq('auth_id', authId)
      .single();

    if (error || !data) {
      return null;
    }

    // Type assertion für das verschachtelte tenant-Objekt
    const tenant = data.tenant as unknown as Pick<DbTenant, 'id' | 'name' | 'slug'>;

    return {
      id: data.id,
      authId: data.auth_id ?? '',
      email: data.email,
      fullName: data.full_name,
      role: data.role as UserRole,
      weeklyHours: data.weekly_hours,
      isActive: data.is_active,
      avatarUrl: data.avatar_url ?? undefined,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    };
  }

  async findByEmailAndTenant(email: string, tenantId: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToEntity(data);
  }

  async findAllByTenant(tenantId: string): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('full_name');

    if (error || !data) {
      return [];
    }

    return data.map((row) => this.mapToEntity(row));
  }

  async findActiveByTenant(tenantId: string): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('full_name');

    if (error || !data) {
      return [];
    }

    return data.map((row) => this.mapToEntity(row));
  }

  async save(user: User): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        id: user.id,
        auth_id: user.authId,
        tenant_id: user.tenantId,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        weekly_hours: user.weeklyHours,
        is_active: user.isActive,
        timetac_id: user.timetacId ?? null,
        avatar_url: user.avatarUrl ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to save user: ${error?.message}`);
    }

    return this.mapToEntity(data);
  }

  async update(user: User): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .update({
        full_name: user.fullName,
        role: user.role,
        weekly_hours: user.weeklyHours,
        is_active: user.isActive,
        timetac_id: user.timetacId ?? null,
        avatar_url: user.avatarUrl ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update user: ${error?.message}`);
    }

    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async findByTenantWithTimetacId(
    tenantId: string
  ): Promise<Array<{ id: string; timetacId: string }>> {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, timetac_id')
      .eq('tenant_id', tenantId)
      .not('timetac_id', 'is', null);

    if (error || !data) {
      return [];
    }

    return data
      .filter((row) => row.timetac_id !== null)
      .map((row) => ({
        id: row.id,
        timetacId: row.timetac_id as string,
      }));
  }

  async updateTimetacId(userId: string, timetacId: string | null): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({
        timetac_id: timetacId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update timetac_id: ${error.message}`);
    }
  }

  /**
   * Mappt eine Datenbank-Row auf eine User-Entity.
   */
  private mapToEntity(row: DbUser): User {
    const props: CreateUserProps = {
      id: row.id,
      authId: row.auth_id ?? '',
      tenantId: row.tenant_id,
      email: row.email,
      fullName: row.full_name,
      role: row.role as UserRole,
      weeklyHours: row.weekly_hours,
      isActive: row.is_active,
      timetacId: row.timetac_id ?? undefined,
      avatarUrl: row.avatar_url ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    return User.create(props);
  }
}
