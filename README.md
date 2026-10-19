# Dark Factory: fábrica de canal dark com IA

Sistema que produz vídeos para canais "dark" do YouTube (sem rosto) usando 8 agentes de IA em linha de produção:

| # | Agente | O que faz |
|---|--------|-----------|
| 1 | **Pauta** | Escolhe o tema (ou refina o que você sugeriu), sem repetir vídeos anteriores |
| 2 | **Roteiro** | Escreve a narração com gancho, blocos e fechamento, além de título, descrição e tags |
| 3 | **Narração** | Gera o áudio de cada bloco (Edge TTS grátis, ElevenLabs ou OpenAI) |
| 4 | **Cenas** | Cria os prompts visuais e gera as imagens (OpenAI, FLUX/fal, Pexels ou placeholder) |
| 5 | **Montagem** | Ken Burns + legendas queimadas + narração + trilha opcional → MP4 1080p |
| 6 | **Shorts** | Escolhe os melhores trechos e renderiza cortes verticais 9:16 com gancho na tela |
| 7 | **Thumbnail** | Imagem + texto de impacto 1280×720 |
| 8 | **Agenda** | **Só depois da sua aprovação**: escolhe o próximo horário livre e envia ao YouTube agendado |

O painel mostra a fábrica em pixel art (cada agente na sua mesa, com balão de fala e console ao vivo), a fila de **Aprovação** ("nada vai ao ar sem o seu OK"), **Agenda**, **Shorts**, **Publicados** e **Canais**.

---

## Arquitetura

```
frontend/  React + Vite + TanStack Query      → painel
backend/   Node + TypeScript + Express (MVC, REST /api/v1)
  ├─ API (src/server.ts)      recebe comandos do painel, nunca renderiza nada pesado
  └─ Worker (src/worker.ts)   consome a fila de jobs e roda os agentes
supabase/  migrations SQL (snake_case)
```

### Camadas do backend (MVC + services)

```
routes/        define endpoints e encadeia middlewares (validação zod, auth)
controllers/   finos: leem req.validated, chamam um service, respondem JSON
services/      regras de negócio (aprovar, revisar, máquina de estados do pipeline)
models/        repositórios Supabase (BaseRepository genérico + consultas do domínio)
validators/    schemas zod de body/query/params
agents/        um arquivo por agente; interface comum Agent.run(context)
providers/     integrações externas atrás de interfaces (LLM, TTS, imagem, YouTube): Strategy + registry
media/         ffmpeg: clipes, legendas ASS, mixagem, thumbnail
lib/           erros tipados, logger (pino), storage (supabase | local), agenda, concorrência
worker/        JobRunner (fila) e manutenção periódica
```

Princípios aplicados: separação de responsabilidades (controller → service → model), injeção de provedores por interface (trocar a voz ou o gerador de imagem é uma linha no registry), validação na borda com zod, erros de domínio tipados com tratamento centralizado, configuração validada no boot (`config/env.ts`) e logs estruturados.

### Por que escala

- **Fila no Postgres** (`jobs`) com `claim_next_job()` usando `FOR UPDATE SKIP LOCKED`: você pode subir **N workers em N máquinas** sem dois pegarem o mesmo job.
- **Workers stateless**: todo arquivo vai para o Supabase Storage; qualquer worker baixa o que precisa sob demanda (`VideoWorkspace`). Uma etapa pode rodar numa máquina e a próxima em outra.
- **Retry com backoff exponencial** por etapa (3 tentativas) e recuperação de jobs presos (`requeue_stale_jobs`) se um worker morrer.
- **API e worker separados**: a renderização (CPU pesada) não trava o painel. Escale cada um de forma independente: `docker compose up --scale worker=4`.
- Máquina de estados única (`PipelineService`): API e workers nunca alteram status por conta própria.

### Banco (snake_case)

`channels`, `youtube_accounts`, `videos`, `video_stages`, `scenes`, `shorts`, `jobs`, `agent_logs` e o bucket privado `media`. RLS fica ligado sem políticas: só o backend (service_role) acessa.

Fluxo de status do vídeo:
`queued → in_production → awaiting_approval → (approve) approved → scheduled → published`
e, fora do caminho feliz, `rejected` e `failed` (com botão "tentar de novo").

---

## Como rodar

**Requisitos:** Node 20+, `ffmpeg` com libass no PATH (`apt install ffmpeg fonts-dejavu-core` ou `brew install ffmpeg`), um projeto Supabase.

```bash
npm install

# 1) Banco: aplique a migration no seu projeto Supabase
#    (SQL Editor → cole supabase/migrations/20261019000000_init.sql)  ou  supabase db push

# 2) Variáveis
cp backend/.env.example backend/.env      # preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
cp frontend/.env.example frontend/.env

# 3) Sobe API + worker + painel
npm run dev
# painel: http://localhost:5173    API: http://localhost:3333/api/v1/health
```

### Testar sem gastar nada

No `backend/.env`, use `LLM_PROVIDER=demo`, crie um canal com imagens `placeholder` e voz `edge`. A fábrica inteira roda com textos de exemplo, voz grátis e fundos escuros: dá para ver o fluxo completo até a aprovação.

### Produção de verdade

1. `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`. O modelo padrão é `claude-opus-5-5` (trocável em `LLM_MODEL`; `claude-sonnet-5-5` sai mais barato). As respostas usam *structured outputs* validados com zod, e o *fallback* server-side da Anthropic fica ligado (`LLM_FALLBACKS=true`): se o modelo recusar um pedido por política, a API tenta de novo num modelo alternativo.
2. Imagens: no canal, escolha `fal` (FLUX schnell, centavos por imagem), `openai` (gpt-image-1) ou `pexels` (fotos grátis).
3. Voz: `edge` já é boa e grátis. Para voz premium, use `elevenlabs` com o `voice_id`.
4. Trilha de fundo: aponte `BACKGROUND_MUSIC_DIR` para uma pasta com MP3s **livres de direitos**.

### Conectar o YouTube

1. Google Cloud Console → ative **YouTube Data API v3** → crie credencial OAuth "Aplicativo da Web".
2. Redirect URI autorizado: `{PUBLIC_API_URL}/api/v1/youtube/callback`.
3. Preencha `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` e clique em **Conectar YouTube** na página Canais.

Os vídeos sobem como privados com `publishAt`, então o próprio YouTube publica no horário. Os shorts são agendados um por dia depois do vídeo longo. Sem YouTube conectado, a aprovação só reserva o horário na agenda.

> ⚠️ Projetos novos do Google Cloud têm cota de ~6 uploads/dia e, até passarem pela auditoria da API, os vídeos ficam travados como privados. Peça a auditoria cedo. Thumbnail customizada exige canal verificado.

---

## API REST (`/api/v1`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | status |
| GET | `/meta/options` | provedores, etapas e integrações configuradas |
| GET | `/factory/status` | estado dos 8 agentes, contagens e console |
| GET | `/factory/logs?video_id=&after_id=` | logs dos agentes |
| GET/POST | `/channels` | listar / criar canal |
| GET/PATCH/DELETE | `/channels/:id` | detalhar / editar / apagar |
| GET | `/channels/:id/youtube/auth-url` | iniciar OAuth |
| DELETE | `/channels/:id/youtube` | desconectar |
| GET | `/videos?status=a,b&channel_id=&limit=&offset=` | listar com etapas e shorts |
| POST | `/videos` | `{ channel_id, topic? }`: nova pauta |
| GET/DELETE | `/videos/:id` | detalhe (com cenas) / apagar |
| POST | `/videos/:id/approve` | `{ scheduled_at? }` |
| POST | `/videos/:id/revise` | `{ notes, from_stage }`: refaz a partir da etapa com as notas |
| POST | `/videos/:id/reject` | `{ reason? }` |
| POST | `/videos/:id/retry` | reprocessa etapa que falhou |
| GET | `/media?path=` | entrega áudio/imagem/vídeo (URL assinada ou arquivo local) |

Se `API_KEY` estiver definida, todas as rotas (exceto health e callback) exigem o header `x-api-key`.

---

## Boas práticas para o canal

- Mantenha a **aprovação humana** e revise fatos: o YouTube desmonetiza conteúdo repetitivo ou "produzido em massa" sem valor agregado.
- O upload já marca `containsSyntheticMedia: true` (divulgação de conteúdo gerado por IA, exigida pela política do YouTube).
- Use só músicas e imagens com licença adequada.

## Scripts

```bash
npm run dev          # API + worker + painel
npm run typecheck    # tipos do backend e do frontend
npm test             # testes (agenda/fusos)
npm run build        # build de produção
```
