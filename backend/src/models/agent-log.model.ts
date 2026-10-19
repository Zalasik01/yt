import type { AgentLog, LogLevel } from './entities.js';
import type { PipelineStage } from './pipeline.js';
import { supabase } from '../lib/supabase.js';
import { unwrap } from './base.repository.js';

class AgentLogModel {
  private get db() {
    return supabase.from('agent_logs');
  }

  async write(entry: { video_id: string | null; stage: PipelineStage | null; level?: LogLevel; message: string }) {
    const result = await this.db.insert({ level: 'info', ...entry });
    unwrap(result, 'agent_logs.write');
  }

  /** Zera o console da fábrica (usado quando a API reinicia). */
  async clear() {
    const result = await this.db.delete().gte('id', 0);
    unwrap(result, 'agent_logs.clear');
  }

  async listRecent(filters: { video_id?: string; limit?: number; after_id?: number } = {}): Promise<AgentLog[]> {
    let query = this.db.select('*');
    if (filters.video_id) query = query.eq('video_id', filters.video_id);
    if (filters.after_id) query = query.gt('id', filters.after_id);
    const result = await query.order('id', { ascending: false }).limit(filters.limit ?? 50);
    return unwrap<AgentLog[]>(result, 'agent_logs.listRecent');
  }

  /** Última fala de cada agente por vídeo (para os balões da fábrica). */
  async latestPerStage(video_ids: string[]): Promise<Map<string, AgentLog>> {
    const latest = new Map<string, AgentLog>();
    if (video_ids.length === 0) return latest;
    const result = await this.db.select('*').in('video_id', video_ids).not('stage', 'is', null).order('id', { ascending: false }).limit(300);
    for (const row of unwrap<AgentLog[]>(result, 'agent_logs.latestPerStage')) {
      const key = `${row.video_id}:${row.stage}`;
      if (!latest.has(key)) latest.set(key, row);
    }
    return latest;
  }
}

export const agent_log_model = new AgentLogModel();
