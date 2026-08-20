-- 7Eventos - Schema inicial (Fase 1 - Fundação e MVP)
--
-- Fonte de verdade funcional: docs/7EVENTOS_SPEC.md e docs/FASE_01_MVP.md
-- Documentação do modelo: docs/architecture/DATABASE.md
--
-- Este arquivo NÃO foi aplicado a nenhum projeto Supabase ainda.
-- Ele documenta o schema alvo para quando o ambiente oficial for
-- provisionado. Ver docs/architecture/DATABASE.md para o passo a passo
-- de aplicação (supabase db push / migration up).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Empresas e usuários
-- ---------------------------------------------------------------------

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text not null,
  documento text not null,
  status text not null default 'ativa' check (status in ('ativa', 'suspensa')),
  configuracoes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type user_role as enum (
  'superadmin',
  'admin_empresa',
  'gestor_eventos',
  'operador',
  'consulta'
);

-- Perfil de aplicação vinculado a um usuário de auth.users (Supabase Auth).
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid references companies (id) on delete restrict,
  nome text not null,
  email text not null,
  perfil user_role not null default 'consulta',
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  avatar_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_company_required_unless_superadmin
    check (perfil = 'superadmin' or company_id is not null)
);

create index if not exists idx_profiles_company on profiles (company_id);

-- ---------------------------------------------------------------------
-- Espaços
-- ---------------------------------------------------------------------

create table if not exists spaces (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  nome text not null,
  local text not null,
  capacidade integer not null check (capacidade >= 0),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  descricao text,
  caracteristicas text[] not null default '{}',
  equipamentos text[] not null default '{}',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_spaces_company on spaces (company_id);
create index if not exists idx_spaces_company_status on spaces (company_id, status);

-- ---------------------------------------------------------------------
-- Eventos
-- ---------------------------------------------------------------------

create type event_status as enum (
  'rascunho',
  'planejamento',
  'aguardando_aprovacao',
  'confirmado',
  'em_execucao',
  'concluido',
  'cancelado'
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  titulo text not null,
  descricao text,
  tematica text,
  categoria text not null,
  status event_status not null default 'rascunho',
  responsavel_id uuid not null references profiles (id),
  demandante text not null,
  contato_demandante text,

  tipo_localizacao text not null default 'interno' check (tipo_localizacao in ('interno', 'externo')),
  local text,
  space_id uuid references spaces (id),
  formato text check (formato in ('presencial', 'online', 'hibrido')),

  escopo text,
  segmento text,
  classificacao text,
  publico_alvo text,
  restrito boolean not null default false,
  detalhes_planejamento text,
  jornada_participante text,
  estrategico boolean not null default false,
  previsto_orcamento boolean not null default false,
  frequencia text check (frequencia in ('unico', 'diario', 'semanal', 'mensal')),

  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid not null references profiles (id),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_company on events (company_id);
create index if not exists idx_events_company_status on events (company_id, status);
create index if not exists idx_events_space on events (space_id);

create table if not exists event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz not null,
  observacao text,
  constraint event_sessions_fim_apos_inicio check (fim > inicio)
);

create index if not exists idx_event_sessions_event on event_sessions (event_id);
create index if not exists idx_event_sessions_inicio on event_sessions (inicio);

create table if not exists event_status_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  event_id uuid not null references events (id) on delete cascade,
  status_anterior event_status,
  status_novo event_status not null,
  user_id uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_event_status_history_event on event_status_history (event_id);

-- ---------------------------------------------------------------------
-- Reservas
-- ---------------------------------------------------------------------

create type reservation_status as enum ('solicitada', 'confirmada', 'cancelada', 'concluida');

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  event_id uuid references events (id) on delete set null,
  space_id uuid not null references spaces (id),
  inicio timestamptz not null,
  fim timestamptz not null,
  quantidade_pessoas integer,
  motivo text not null,
  status reservation_status not null default 'solicitada',
  solicitante_id uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_fim_apos_inicio check (fim > inicio)
);

create index if not exists idx_reservations_company on reservations (company_id);
create index if not exists idx_reservations_space_periodo on reservations (space_id, inicio, fim);
create index if not exists idx_reservations_event on reservations (event_id);

-- RN02/RN04: impede reservas ativas conflitantes para o mesmo espaço via
-- índice de exclusão baseado em intervalo (defesa adicional além da
-- validação de aplicação em src/lib/domain/availability.ts).
create extension if not exists btree_gist;

alter table reservations
  add column if not exists periodo tstzrange
  generated always as (tstzrange(inicio, fim, '[)')) stored;

create index if not exists idx_reservations_periodo_gist on reservations using gist (space_id, periodo);

-- ---------------------------------------------------------------------
-- Checklist
-- ---------------------------------------------------------------------

create type checklist_status as enum ('pendente', 'em_andamento', 'concluido', 'bloqueado', 'cancelado');

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  event_id uuid not null references events (id) on delete cascade,
  titulo text not null,
  categoria text,
  responsavel_id uuid references profiles (id),
  prazo timestamptz,
  status checklist_status not null default 'pendente',
  observacao text,
  concluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_checklist_event on checklist_items (event_id);

-- ---------------------------------------------------------------------
-- Orçamento básico
-- ---------------------------------------------------------------------

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  event_id uuid not null references events (id) on delete cascade,
  valor_previsto numeric(14, 2) not null default 0,
  observacoes text,
  status text not null default 'previsto' check (status in ('previsto', 'em_analise', 'aprovado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id)
);

-- ---------------------------------------------------------------------
-- Complexidade
-- ---------------------------------------------------------------------

create table if not exists complexity_assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  event_id uuid not null references events (id) on delete cascade,
  fatores jsonb not null,
  esforco integer not null,
  impacto integer not null,
  pontuacao integer not null,
  nivel text not null check (nivel in ('baixa', 'media', 'alta', 'critica')),
  created_at timestamptz not null default now()
);

create index if not exists idx_complexity_event on complexity_assessments (event_id, created_at desc);

-- ---------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  user_id uuid not null references profiles (id),
  acao text not null,
  entidade text not null,
  entidade_id text not null,
  descricao text not null,
  metadados jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_company_created on audit_logs (company_id, created_at desc);

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array['companies', 'profiles', 'spaces', 'events', 'reservations', 'checklist_items', 'budgets']
  loop
    execute format(
      'create trigger set_updated_at before update on %I for each row execute function set_updated_at()',
      t
    );
  end loop;
end $$;
