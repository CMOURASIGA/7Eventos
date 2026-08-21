-- 7Eventos - Fase 2 (Gestão Completa do Evento) - Fatia 4d: Riscos registrados
--
-- Fonte de verdade funcional: docs/FASE_02_GESTAO.md seção 10 (Central de
-- Operação, bloco "riscos registrados"). Decisão de produto confirmada
-- pelo usuário: lista estruturada com severidade + status (não um campo
-- de texto livre único por evento).
--
-- Este arquivo NÃO foi aplicado a nenhum projeto Supabase ainda (assim
-- como 0001 a 0006). Documenta o schema alvo para quando o ambiente
-- oficial for provisionado — a validação operacional (rodar os
-- advisors de segurança/performance e testar o PostgREST real) é feita
-- como parte da implantação, não deste trabalho de preparação. Como as
-- demais migrations deste projeto, é escrita para rodar uma única vez
-- via `supabase db push` (histórico controlado por
-- supabase_migrations.schema_migrations) — não como script reaplicável;
-- por isso segue o mesmo padrão não-idempotente das anteriores para
-- tipos/triggers/policies (create type / create trigger / create
-- policy sem guarda), enquanto a tabela mantém "if not exists" por
-- segurança adicional em reaplicação manual.

create type event_risk_severity as enum ('baixa', 'media', 'alta', 'critica');
create type event_risk_status as enum ('aberto', 'em_mitigacao', 'mitigado', 'encerrado');

create table if not exists event_risks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  event_id uuid not null,
  titulo text not null,
  descricao text,
  severidade event_risk_severity not null default 'media',
  status event_risk_status not null default 'aberto',
  responsavel_id uuid,
  plano_mitigacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_risks_id_company_unique unique (id, company_id),
  constraint event_risks_event_company_fk
    foreign key (event_id, company_id) references events (id, company_id) on delete cascade,
  -- Nullable: MATCH SIMPLE (padrão do Postgres) não exige a FK quando a
  -- coluna é null, então "sem responsável definido" continua permitido;
  -- quando preenchido, precisa ser um profile da mesma empresa (mesmo
  -- raciocínio de schedule_items/event_documents em
  -- 0004_fase2_cronograma_documentos.sql).
  constraint event_risks_responsavel_company_fk
    foreign key (responsavel_id, company_id) references profiles (id, company_id)
);

create index if not exists idx_event_risks_event on event_risks (event_id);
-- Toda policy filtra por company_id (+ event_id na consulta típica da
-- aba do evento) — índice composto evita full scan conforme a base
-- cresce, já que o custo de RLS escala com as linhas examinadas.
create index if not exists idx_event_risks_company_event on event_risks (company_id, event_id);
create index if not exists idx_event_risks_status on event_risks (company_id, status);

-- ---------------------------------------------------------------------
-- updated_at automático (mesmo padrão das migrations anteriores)
-- ---------------------------------------------------------------------

create trigger set_updated_at before update on event_risks for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security (mesmo padrão de schedule_items/event_documents em
-- 0004_fase2_cronograma_documentos.sql): isolamento por company_id,
-- escrita liberada para perfis diferentes de "consulta" e restrita a
-- Admin/Gestor/Operador (manage_risks em src/lib/domain/permissions.ts —
-- mesmo grupo de manage_checklist/manage_schedule/manage_documents).
-- Toda policy é escopada "to authenticated": ainda que um papel anônimo
-- normalmente nem resolva empresa/perfil, restringir explicitamente ao
-- papel autenticado é a orientação atual do Supabase para RLS, em vez
-- de depender só do predicado de autorização.
-- ---------------------------------------------------------------------

alter table event_risks enable row level security;

create policy event_risks_select on event_risks for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy event_risks_write on event_risks for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() <> 'consulta')
  with check (company_id = current_profile_company_id() and current_profile_role() <> 'consulta');

-- ---------------------------------------------------------------------
-- Privilégios explícitos na Data API (PostgREST)
--
-- Mesmo raciocínio de 0002 a 0006: o 7Eventos só acessa o Postgres pelo
-- cliente de serviço no servidor (role service_role). service_role
-- ignora RLS (BYPASSRLS), mas isso não dispensa GRANT — RLS e
-- privilégios são camadas independentes, e o PostgREST aplica os
-- privilégios normais do Postgres antes de sequer avaliar policies. Como
-- a exposição de tabelas via Data API passou a ser opt-in em projetos
-- novos do Supabase (privilégios automáticos desativados), sem GRANT
-- explícito o service_role receberia "42501 permission denied for
-- table" ao acessar via PostgREST. Por isso: REVOKE explícito de
-- "authenticated"/"anon" (ninguém no navegador acessa direto — nenhum
-- client Supabase no navegador consulta esta tabela com JWT de usuário)
-- e GRANT explícito para "service_role" (é assim que o backend acessa).
-- ---------------------------------------------------------------------

revoke all on event_risks from authenticated, anon;

grant select, insert, update, delete on event_risks to service_role;
