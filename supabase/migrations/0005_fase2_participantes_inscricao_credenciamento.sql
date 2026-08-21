-- 7Eventos - Fase 2 (Gestão Completa do Evento) - Fatia 3: Participantes + Inscrição + Credenciamento
--
-- Fonte de verdade funcional: docs/FASE_02_GESTAO.md seções 6, 7 e 8.
--
-- Este arquivo NÃO foi aplicado a nenhum projeto Supabase ainda (assim
-- como 0001/0002/0003/0004). Documenta o schema alvo para quando o
-- ambiente oficial for provisionado — a validação operacional (rodar os
-- advisors de segurança/performance e testar o PostgREST real) é feita
-- como parte da implantação, não deste trabalho de preparação. Como as
-- demais migrations deste projeto, é escrita para rodar uma única vez
-- via `supabase db push` (histórico controlado por
-- supabase_migrations.schema_migrations) — não como script reaplicável;
-- por isso segue o mesmo padrão não-idempotente de 0001/0002/0003/0004
-- para tipos/triggers/policies (create type / create trigger / create
-- policy sem guarda), enquanto as tabelas mantêm "if not exists" por
-- segurança adicional em reaplicação manual.

-- ---------------------------------------------------------------------
-- Participantes (catálogo por empresa, independente de evento)
--
-- Mesmo padrão de suppliers (0003_fase2_fornecedores_equipe.sql):
-- cadastro único por empresa, reaproveitável em qualquer evento via
-- event_registrations, abaixo. Só os campos pedidos pela spec — "evitar
-- coleta de dados sem finalidade operacional" (seção 6).
-- ---------------------------------------------------------------------

create type participant_status as enum ('ativo', 'inativo');

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  nome text not null,
  email text not null,
  telefone text,
  organizacao text,
  categoria text,
  status participant_status not null default 'ativo',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Base para FK composta (participant_id, company_id) -> participants em
  -- event_registrations, abaixo.
  constraint participants_id_company_unique unique (id, company_id)
);

create index if not exists idx_participants_company on participants (company_id);
create index if not exists idx_participants_company_status on participants (company_id, status);

-- ---------------------------------------------------------------------
-- Inscrição + Credenciamento
--
-- O credenciamento (seção 8 — check-in, horário, presentes/ausentes) é
-- tratado como um estado da própria inscrição (check_in_at/
-- check_in_por_id), não uma tabela separada: só faz sentido credenciar
-- quem já está inscrito no evento, e "presentes"/"ausentes" nada mais
-- são do que inscrições confirmadas com ou sem check_in_at preenchido —
-- os "indicadores em tempo real" da spec são uma consulta de contagem
-- sobre esta mesma tabela, não uma entidade própria.
--
-- event_id/participant_id/check_in_por_id são FK compostas contra
-- (id, company_id) das tabelas referenciadas, mesmo raciocínio das
-- fatias anteriores: o cliente de serviço usado pelo backend ignora
-- RLS, então uma FK simples deixaria gravar company_id de uma empresa
-- com, por exemplo, event_id de outra.
-- ---------------------------------------------------------------------

create type event_registration_status as enum ('solicitada', 'confirmada', 'cancelada');

create table if not exists event_registrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  event_id uuid not null,
  participant_id uuid not null,
  lote text,
  categoria text,
  status event_registration_status not null default 'solicitada',
  check_in_at timestamptz,
  check_in_por_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Mesmo participante não pode se inscrever duas vezes no mesmo evento
  -- (a aplicação também valida isso antes do insert).
  unique (event_id, participant_id),
  constraint event_registrations_id_company_unique unique (id, company_id),
  constraint event_registrations_event_company_fk
    foreign key (event_id, company_id) references events (id, company_id) on delete cascade,
  constraint event_registrations_participant_company_fk
    foreign key (participant_id, company_id) references participants (id, company_id),
  -- Nullable: MATCH SIMPLE (padrão do Postgres) não exige a FK quando
  -- check_in_por_id é null (inscrição ainda não credenciada); quando
  -- preenchido, precisa ser um profile da mesma empresa.
  constraint event_registrations_checkin_por_company_fk
    foreign key (check_in_por_id, company_id) references profiles (id, company_id)
);

create index if not exists idx_event_registrations_event on event_registrations (event_id);
create index if not exists idx_event_registrations_participant on event_registrations (participant_id);
-- Toda policy filtra por company_id (+ event_id na consulta típica da
-- aba do evento) — índice composto evita full scan conforme a base
-- cresce, já que o custo de RLS escala com as linhas examinadas.
create index if not exists idx_event_registrations_company_event on event_registrations (company_id, event_id);

-- ---------------------------------------------------------------------
-- updated_at automático (mesmo padrão de 0001/0003/0004)
-- ---------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['participants', 'event_registrations']
  loop
    execute format(
      'create trigger set_updated_at before update on %I for each row execute function set_updated_at()',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security (mesmo padrão de 0002/0003/0004): isolamento por
-- company_id, escrita liberada para perfis diferentes de "consulta" —
-- manage_participants/manage_registrations em src/lib/domain/
-- permissions.ts são concedidas a Admin/Gestor/Operador (credenciamento
-- é trabalho de campo tipicamente feito pelo Operador na entrada do
-- evento). Toda policy é escopada "to authenticated": ainda que um
-- papel anônimo normalmente nem resolva empresa/perfil, restringir
-- explicitamente ao papel autenticado é a orientação atual do Supabase
-- para RLS, em vez de depender só do predicado de autorização.
-- ---------------------------------------------------------------------

alter table participants enable row level security;
alter table event_registrations enable row level security;

create policy participants_select on participants for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy participants_write on participants for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() <> 'consulta')
  with check (company_id = current_profile_company_id() and current_profile_role() <> 'consulta');

create policy event_registrations_select on event_registrations for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy event_registrations_write on event_registrations for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() <> 'consulta')
  with check (company_id = current_profile_company_id() and current_profile_role() <> 'consulta');

-- ---------------------------------------------------------------------
-- Privilégios explícitos na Data API (PostgREST)
--
-- Mesmo raciocínio de 0002/0003/0004: o 7Eventos só acessa o Postgres
-- pelo cliente de serviço no servidor (role service_role). service_role
-- ignora RLS (BYPASSRLS), mas isso não dispensa GRANT — RLS e
-- privilégios são camadas independentes, e o PostgREST aplica os
-- privilégios normais do Postgres antes de sequer avaliar policies. Como
-- a exposição de tabelas via Data API passou a ser opt-in em projetos
-- novos do Supabase (privilégios automáticos desativados), sem GRANT
-- explícito o service_role receberia "42501 permission denied for
-- table" ao acessar via PostgREST. Por isso: REVOKE explícito de
-- "authenticated"/"anon" (ninguém no navegador acessa direto — nenhum
-- client Supabase no navegador consulta estas tabelas com JWT de
-- usuário) e GRANT explícito para "service_role" (é assim que o backend
-- acessa).
-- ---------------------------------------------------------------------

revoke all on participants, event_registrations from authenticated, anon;

grant select, insert, update, delete on participants, event_registrations to service_role;
