import type { Insert, Job, Update } from './entities.js';
import type { PipelineStage } from './pipeline.js';
import { supabase } from '../lib/supabase.js';
import { BaseRepository, unwrap } from './base.repository.js';

class JobModel extends BaseRepository<Job, Insert<Job>, Update<Job>> {
  protected readonly table = 'jobs';
  protected readonly resource_name = 'Job';

  async enqueue(video_id: string, stage: PipelineStage, payload: Record<string, unknown> = {}): Promise<Job> {
    return this.create({
      video_id,
      stage,
      payload,
      status: 'queued',
      attempts: 0,
      max_attempts: 3,
      run_after: new Date().toISOString(),
      locked_by: null,
      locked_at: null,
      last_error: null,
    });
  }

  /** Reserva atômica via função SQL com FOR UPDATE SKIP LOCKED. */
  async claimNext(worker_id: string): Promise<Job | null> {
    const result = await supabase.rpc('claim_next_job', { p_worker_id: worker_id });
    const rows = unwrap<Job[]>(result, 'jobs.claimNext');
    return rows[0] ?? null;
  }

  async requeueStale(stale_after_minutes = 30): Promise<number> {
    const result = await supabase.rpc('requeue_stale_jobs', {
      p_stale_after: `${stale_after_minutes} minutes`,
    });
    return unwrap<number>(result, 'jobs.requeueStale');
  }

  async cancelPendingForVideo(video_id: string): Promise<void> {
    const result = await this.db
      .update({ status: 'cancelled' })
      .eq('video_id', video_id)
      .in('status', ['queued']);
    unwrap(result, 'jobs.cancelPendingForVideo');
  }

  async hasActiveJob(video_id: string): Promise<boolean> {
    const result = await this.db
      .select('id', { count: 'exact', head: true })
      .eq('video_id', video_id)
      .in('status', ['queued', 'running']);
    if (result.error) unwrap(result, 'jobs.hasActiveJob');
    return (result.count ?? 0) > 0;
  }

  async countQueued(): Promise<number> {
    const result = await this.db.select('id', { count: 'exact', head: true }).eq('status', 'queued');
    if (result.error) unwrap(result, 'jobs.countQueued');
    return result.count ?? 0;
  }
}

export const job_model = new JobModel();
