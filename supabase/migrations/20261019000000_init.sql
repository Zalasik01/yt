-- =============================================================================
-- Canal Dark Factory — schema inicial
-- Convenção: snake_case em tabelas, colunas, enums e funções.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type pipeline_stage as enum (
  'pauta', 'roteiro', 'narracao', 'cenas', 'montagem', 'shorts', 'thumbnail', 'agenda'
);

create type stage_status as enum ('pending', 'running', 'done', 'failed', 'skipped');

create type video_status as enum (
  'queued',             -- criado, aguardando o primeiro agente
  'in_production',      -- algum agente trabalhando
  'awaiting_approval',  -- tudo pronto, esperando o OK humano
  'approved',           -- aprovado, aguardando agendamento/upload
  'scheduled',          -- enviado ao YouTube com data de publicação
  'published',
  'rejected',
  'failed'
);

create type job_status as enum ('queued', 'running', 'done', 'failed', 'cancelled');

create type short_status as enum ('pending', 'rendered', 'scheduled', 'published', 'failed');

create type log_level as enum ('debug', 'info', 'warn', 'error');

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- channels: configuração de cada canal dark
-- -----------------------------------------------------------------------------
create table channels (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  niche                   text not null,
  description             text,
  language                text not null default 'pt-BR',
  tone                    text not null default 'misterioso, envolvente, narrativo',
  target_duration_minutes integer not null default 8 check (target_duration_minutes between 1 and 60),
  shorts_per_video        integer not null default 3 check (shorts_per_video between 0 and 10),
  tts_provider            text not null default 'edge',
  tts_voice               text not null default 'pt-BR-AntonioNeural',
  image_provider          text not null default 'placeholder',
  image_style             text not null default 'cinematic, dark, moody lighting, high detail, 16:9',
  publish_timezone        text not null default 'America/Sao_Paulo',
  publish_days            smallint[] not null default '{1,2,3,4,5,6,0}', -- 0 = domingo
  publish_times           text[] not null default '{18:00}',             -- HH:MM
  auto_produce            boolean not null default false,
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger channels_set_updated_at
before update on channels
for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- youtube_accounts: credenciais OAuth por canal (separadas da config)
-- -----------------------------------------------------------------------------
create table youtube_accounts (
  id                  uuid primary key default gen_random_uuid(),
  channel_id          uuid not null unique references channels(id) on delete cascade,
  youtube_channel_id  text,
  youtube_title       text,
  refresh_token       text not null,
  scopes              text[] not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger youtube_accounts_set_updated_at
before update on youtube_accounts
for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- videos: cada vídeo longo produzido pela fábrica
-- -----------------------------------------------------------------------------
create table videos (
  id                 uuid primary key default gen_random_uuid(),
  channel_id         uuid not null references channels(id) on delete cascade,
  status             video_status not null default 'queued',
  current_stage      pipeline_stage,
  topic              text,
  title              text,
  description        text,
  tags               text[] not null default '{}',
  angle              text,
  script             jsonb,
  revision_notes     text,
  duration_seconds   numeric(10, 2),
  video_path         text,
  thumbnail_path     text,
  thumbnail_text     text,
  scheduled_at       timestamptz,
  published_at       timestamptz,
  youtube_video_id   text,
  error_message      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index videos_channel_id_idx on videos (channel_id);
create index videos_status_idx on videos (status);
create index videos_scheduled_at_idx on videos (scheduled_at) where scheduled_at is not null;

create trigger videos_set_updated_at
before update on videos
for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- video_stages: estado de cada agente para cada vídeo
-- -----------------------------------------------------------------------------
create table video_stages (
  id           uuid primary key default gen_random_uuid(),
  video_id     uuid not null references videos(id) on delete cascade,
  stage        pipeline_stage not null,
  status       stage_status not null default 'pending',
  attempts     integer not null default 0,
  output       jsonb,
  error        text,
  started_at   timestamptz,
  finished_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (video_id, stage)
);

create trigger video_stages_set_updated_at
before update on video_stages
for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- scenes: blocos narrados do roteiro (1 cena = 1 trecho de narração + 1 imagem)
-- -----------------------------------------------------------------------------
create table scenes (
  id                uuid primary key default gen_random_uuid(),
  video_id          uuid not null references videos(id) on delete cascade,
  position          integer not null,
  narration_text    text not null,
  image_prompt      text,
  search_query      text,
  audio_path        text,
  image_path        text,
  duration_seconds  numeric(10, 2),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (video_id, position)
);

create trigger scenes_set_updated_at
before update on scenes
for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- shorts: cortes verticais derivados do vídeo longo
-- -----------------------------------------------------------------------------
create table shorts (
  id                uuid primary key default gen_random_uuid(),
  video_id          uuid not null references videos(id) on delete cascade,
  position          integer not null,
  title             text not null,
  hook              text,
  description       text,
  start_seconds     numeric(10, 2) not null,
  end_seconds       numeric(10, 2) not null,
  status            short_status not null default 'pending',
  video_path        text,
  scheduled_at      timestamptz,
  youtube_video_id  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (video_id, position),
  check (end_seconds > start_seconds)
);

create trigger shorts_set_updated_at
before update on shorts
for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- jobs: fila de trabalho dos agentes (consumida por N workers)
-- -----------------------------------------------------------------------------
create table jobs (
  id            uuid primary key default gen_random_uuid(),
  video_id      uuid not null references videos(id) on delete cascade,
  stage         pipeline_stage not null,
  status        job_status not null default 'queued',
  payload       jsonb not null default '{}',
  attempts      integer not null default 0,
  max_attempts  integer not null default 3,
  run_after     timestamptz not null default now(),
  locked_by     text,
  locked_at     timestamptz,
  last_error    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index jobs_claim_idx on jobs (status, run_after) where status = 'queued';
create index jobs_video_id_idx on jobs (video_id);

create trigger jobs_set_updated_at
before update on jobs
for each row execute function set_updated_at();

-- Reserva atômica do próximo job. SKIP LOCKED permite vários workers sem
-- disputa: cada um pega um job diferente.
create or replace function claim_next_job(p_worker_id text)
returns setof jobs
language plpgsql
as $$
begin
  return query
  update jobs
     set status    = 'running',
         locked_by = p_worker_id,
         locked_at = now(),
         attempts  = attempts + 1
   where id = (
     select id
       from jobs
      where status = 'queued'
        and run_after <= now()
      order by run_after, created_at
      for update skip locked
      limit 1
   )
  returning *;
end;
$$;

-- Devolve à fila jobs presos em workers que morreram.
create or replace function requeue_stale_jobs(p_stale_after interval default interval '30 minutes')
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  update jobs
     set status    = 'queued',
         locked_by = null,
         locked_at = null
   where status = 'running'
     and locked_at < now() - p_stale_after;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- agent_logs: o "console" da fábrica e os balões de fala dos agentes
-- -----------------------------------------------------------------------------
create table agent_logs (
  id          bigint generated always as identity primary key,
  video_id    uuid references videos(id) on delete cascade,
  stage       pipeline_stage,
  level       log_level not null default 'info',
  message     text not null,
  created_at  timestamptz not null default now()
);

create index agent_logs_created_at_idx on agent_logs (created_at desc);
create index agent_logs_video_id_idx on agent_logs (video_id);

-- -----------------------------------------------------------------------------
-- Segurança: o backend usa a service_role key (bypassa RLS). Habilitamos RLS
-- sem políticas para que a anon key não leia nada diretamente.
-- -----------------------------------------------------------------------------
alter table channels         enable row level security;
alter table youtube_accounts enable row level security;
alter table videos           enable row level security;
alter table video_stages     enable row level security;
alter table scenes           enable row level security;
alter table shorts           enable row level security;
alter table jobs             enable row level security;
alter table agent_logs       enable row level security;

revoke execute on function claim_next_job(text) from public, anon, authenticated;
revoke execute on function requeue_stale_jobs(interval) from public, anon, authenticated;
grant execute on function claim_next_job(text) to service_role;
grant execute on function requeue_stale_jobs(interval) to service_role;

-- -----------------------------------------------------------------------------
-- Storage: bucket privado para áudios, imagens, vídeos e thumbnails
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;
