-- 7Eventos - Fase 2 (Gestão Completa do Evento) - Fatia 1: Fornecedores + Equipe
--
-- Fonte de verdade funcional: docs/FASE_02_GESTAO.md seções 2 e 3.
--
-- Este arquivo NÃO foi aplicado a nenhum projeto Supabase ainda (assim
-- como 0001/0002). Documenta o schema alvo para quando o ambiente
-- oficial for provisionado. Como as demais migrations deste projeto,
-- é escrita para rodar uma única vez via `supabase db push` (histórico
-- controlado por supabase_migrations.schema_migrations) — não como
-- script reaplicável; por isso segue o mesmo padrão não-idempotente de
-- 0001/0002 para tipos/triggers/policies (create type / create trigger
-- / create policy sem guarda), enquanto as tabelas mantêm
-- "if not exists" por segurança adicional em reaplicação manual.

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
-- Vínculo de fornecedores a eventos (dados operacionais)
--
-- Valores financeiros (previsto/contratado) NÃO ficam aqui — RLS
-- protege linhas, não colunas: qualquer usuário da empresa com SELECT
-- em event_suppliers veria o valor se ele estivesse nesta tabela,
-- mesmo com a UI escondendo o campo. Por isso os valores moram em
-- event_supplier_financials, com policy de leitura restrita a
-- Gestor/Admin (ver seção "Row Level Security" abaixo).
-- ---------------------------------------------------------------------

create type event_supplier_situacao as enum ('previsto', 'contratado', 'confirmado', 'concluido', 'cancelado');

create table if not exists event_suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  event_id uuid not null references events (id) on delete cascade,
  supplier_id uuid not null references suppliers (id),
  servico text not null,
  responsavel_interno_id uuid references profiles (id),
  situacao event_supplier_situacao not null default 'previsto',
  data_inicio timestamptz,
  data_fim timestamptz,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_suppliers_datas check (data_fim is null or data_inicio is null or data_fim > data_inicio)
);

create index if not exists idx_event_suppliers_event on event_suppliers (event_id);
create index if not exists idx_event_suppliers_supplier on event_suppliers (supplier_id);
-- Toda policy filtra por company_id (+ event_id na consulta típica da
-- aba do evento) — índice composto evita full scan conforme a base
-- cresce, já que o custo de RLS escala com as linhas examinadas.
create index if not exists idx_event_suppliers_company_event on event_suppliers (company_id, event_id);

create table if not exists event_supplier_financials (
  event_supplier_id uuid primary key references event_suppliers (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  valor_previsto numeric(14, 2) check (valor_previsto is null or valor_previsto >= 0),
  valor_contratado numeric(14, 2) check (valor_contratado is null or valor_contratado >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_supplier_financials_company on event_supplier_financials (company_id);

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
  updated_at timestamptz not null default now(),
  -- Mesma pessoa não pode ser alocada duas vezes ao mesmo evento
  -- (a aplicação também valida isso antes do insert).
  unique (event_id, user_id)
);

create index if not exists idx_event_team_members_event on event_team_members (event_id);
create index if not exists idx_event_team_members_user on event_team_members (user_id);
create index if not exists idx_event_team_company_event on event_team_members (company_id, event_id);

-- ---------------------------------------------------------------------
-- updated_at automático (mesmo padrão de 0001_initial_schema.sql)
-- ---------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['suppliers', 'event_suppliers', 'event_supplier_financials', 'event_team_members']
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
-- de "consulta" no catálogo de fornecedores e restrita a Admin/Gestor
-- nas tabelas de vínculo de evento — mesma regra de manage_suppliers/
-- manage_team em src/lib/domain/permissions.ts. Toda policy é escopada
-- "to authenticated": ainda que um papel anônimo normalmente nem
-- resolva empresa/perfil, restringir explicitamente ao papel
-- autenticado é a orientação atual do Supabase para RLS, em vez de
-- depender só do predicado de autorização.
-- ---------------------------------------------------------------------

alter table suppliers enable row level security;
alter table event_suppliers enable row level security;
alter table event_supplier_financials enable row level security;
alter table event_team_members enable row level security;

create policy suppliers_select on suppliers for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy suppliers_write on suppliers for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'))
  with check (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'));

create policy event_suppliers_select on event_suppliers for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy event_suppliers_write on event_suppliers for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'))
  with check (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'));

-- Diferente de event_suppliers: só Gestor/Admin podem LER valores
-- financeiros, não só escrever. Consulta/Operador nunca têm SELECT
-- aqui, mesmo que acessem a Data API diretamente com o próprio JWT —
-- é essa policy, e não a UI, que impede o vazamento de valor.
create policy event_supplier_financials_select on event_supplier_financials for select
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'));
create policy event_supplier_financials_write on event_supplier_financials for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'))
  with check (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'));

create policy event_team_members_select on event_team_members for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy event_team_members_write on event_team_members for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'))
  with check (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'));
