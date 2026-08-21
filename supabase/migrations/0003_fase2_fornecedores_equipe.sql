-- 7Eventos - Fase 2 (Gestão Completa do Evento) - Fatia 1: Fornecedores + Equipe
--
-- Fonte de verdade funcional: docs/FASE_02_GESTAO.md seções 2 e 3.
--
-- Este arquivo NÃO foi aplicado a nenhum projeto Supabase ainda (assim
-- como 0001/0002). Documenta o schema alvo para quando o ambiente
-- oficial for provisionado.

-- ---------------------------------------------------------------------
-- Fornecedores (catálogo por empresa, independente de evento)
-- ---------------------------------------------------------------------

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  nome text not null,
  documento text,
  categoria text not null,
  contato text,
  servicos text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_suppliers_company on suppliers (company_id);
create index if not exists idx_suppliers_company_status on suppliers (company_id, status);

-- ---------------------------------------------------------------------
-- Vínculo de fornecedores a eventos
-- ---------------------------------------------------------------------

create type event_supplier_situacao as enum ('previsto', 'contratado', 'confirmado', 'concluido', 'cancelado');

create table if not exists event_suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  event_id uuid not null references events (id) on delete cascade,
  supplier_id uuid not null references suppliers (id),
  servico text not null,
  responsavel_interno_id uuid references profiles (id),
  valor_previsto numeric(14, 2),
  valor_contratado numeric(14, 2),
  situacao event_supplier_situacao not null default 'previsto',
  data_inicio timestamptz,
  data_fim timestamptz,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_suppliers_event on event_suppliers (event_id);
create index if not exists idx_event_suppliers_supplier on event_suppliers (supplier_id);

-- ---------------------------------------------------------------------
-- Equipe do evento (alocação de usuários já cadastrados na empresa)
-- ---------------------------------------------------------------------

create type team_member_status as enum ('convidado', 'confirmado', 'em_atividade', 'concluido', 'cancelado');

create table if not exists event_team_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references profiles (id),
  funcao text not null,
  responsabilidade text,
  escala text,
  status team_member_status not null default 'convidado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_team_members_event on event_team_members (event_id);
create index if not exists idx_event_team_members_user on event_team_members (user_id);

-- ---------------------------------------------------------------------
-- updated_at automático (mesmo padrão de 0001_initial_schema.sql)
-- ---------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['suppliers', 'event_suppliers', 'event_team_members']
  loop
    execute format(
      'create trigger set_updated_at before update on %I for each row execute function set_updated_at()',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security (mesmo padrão de 0002_row_level_security.sql):
-- isolamento por company_id, escrita liberada para perfis diferentes
-- de "consulta" (a validação fina por capability é feita em
-- src/lib/domain/permissions.ts na camada de aplicação).
-- ---------------------------------------------------------------------

alter table suppliers enable row level security;
alter table event_suppliers enable row level security;
alter table event_team_members enable row level security;

create policy suppliers_select on suppliers for select
  using (company_id = current_profile_company_id());
create policy suppliers_write on suppliers for all
  using (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'))
  with check (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'));

create policy event_suppliers_select on event_suppliers for select
  using (company_id = current_profile_company_id());
create policy event_suppliers_write on event_suppliers for all
  using (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'))
  with check (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'));

create policy event_team_members_select on event_team_members for select
  using (company_id = current_profile_company_id());
create policy event_team_members_write on event_team_members for all
  using (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'))
  with check (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'));
