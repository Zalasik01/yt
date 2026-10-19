import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.js';
import { DatabaseError, NotFoundError } from '../lib/errors.js';

export interface ListOptions {
  limit?: number;
  offset?: number;
  order_by?: string;
  ascending?: boolean;
}

export function unwrap<T>(result: { data: T | null; error: PostgrestError | null }, context: string): T {
  if (result.error) {
    throw new DatabaseError(`${context}: ${result.error.message}`, result.error);
  }
  return result.data as T;
}

/**
 * Repositório genérico sobre uma tabela do Supabase. Cada model concreto
 * herda o CRUD e acrescenta apenas as consultas específicas do seu domínio.
 */
export abstract class BaseRepository<TEntity extends { id: string | number }, TInsert, TUpdate> {
  protected abstract readonly table: string;
  protected abstract readonly resource_name: string;

  protected get db() {
    return supabase.from(this.table);
  }

  async findById(id: TEntity['id']): Promise<TEntity | null> {
    const result = await this.db.select('*').eq('id', id).maybeSingle();
    return unwrap<TEntity | null>(result, `${this.table}.findById`);
  }

  async getById(id: TEntity['id']): Promise<TEntity> {
    const entity = await this.findById(id);
    if (!entity) throw new NotFoundError(this.resource_name, String(id));
    return entity;
  }

  async list(filters: Record<string, unknown> = {}, options: ListOptions = {}): Promise<TEntity[]> {
    const { limit = 50, offset = 0, order_by = 'created_at', ascending = false } = options;
    let query = this.db.select('*');
    for (const [column, value] of Object.entries(filters)) {
      if (value === undefined) continue;
      query = Array.isArray(value) ? query.in(column, value) : query.eq(column, value);
    }
    const result = await query.order(order_by, { ascending }).range(offset, offset + limit - 1);
    return unwrap<TEntity[]>(result, `${this.table}.list`) ?? [];
  }

  async create(input: TInsert): Promise<TEntity> {
    const result = await this.db.insert(input as never).select('*').single();
    return unwrap<TEntity>(result, `${this.table}.create`);
  }

  async createMany(input: TInsert[]): Promise<TEntity[]> {
    if (input.length === 0) return [];
    const result = await this.db.insert(input as never).select('*');
    return unwrap<TEntity[]>(result, `${this.table}.createMany`);
  }

  async update(id: TEntity['id'], input: TUpdate): Promise<TEntity> {
    const result = await this.db.update(input as never).eq('id', id).select('*').maybeSingle();
    const entity = unwrap<TEntity | null>(result, `${this.table}.update`);
    if (!entity) throw new NotFoundError(this.resource_name, String(id));
    return entity;
  }

  async delete(id: TEntity['id']): Promise<void> {
    const result = await this.db.delete().eq('id', id);
    unwrap(result, `${this.table}.delete`);
  }
}
