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
  updated_at timestamptz not null default now(),
  -- Base para FK composta (supplier_id, company_id) -> suppliers em
  -- event_suppliers, abaixo.
  constraint suppliers_id_company_unique unique (id, company_id)
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
--
-- event_id/supplier_id/responsavel_interno_id são FK compostas contra
-- (id, company_id) das tabelas referenciadas, não FK simples de id —
-- a aplicação já valida isso antes de gravar (src/lib/data/mock e
-- src/lib/data/supabase), mas o cliente de serviço usado pelo backend
-- ignora RLS, e a Data API pode ser acessada diretamente por um
-- usuário autenticado com os UUIDs certos. FK simples deixaria gravar
-- company_id da Consult com event_id de outra empresa; FK composta
-- torna essa combinação impossível no próprio banco, não só na app.
-- ---------------------------------------------------------------------

create type event_supplier_situacao as enum ('previsto', 'contratado', 'confirmado', 'concluido', 'cancelado');

create table if not exists event_suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  event_id uuid not null,
  supplier_id uuid not null,
  servico text not null,
  responsavel_interno_id uuid,
  situacao event_supplier_situacao not null default 'previsto',
  data_inicio timestamptz,
  data_fim timestamptz,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_suppliers_datas check (data_fim is null or data_inicio is null or data_fim > data_inicio),
  -- Base para a FK composta de event_supplier_financials, abaixo.
  constraint event_suppliers_id_company_unique unique (id, company_id),
  constraint event_suppliers_event_company_fk
    foreign key (event_id, company_id) references events (id, company_id) on delete cascade,
  constraint event_suppliers_supplier_company_fk
    foreign key (supplier_id, company_id) references suppliers (id, company_id),
  -- Nullable: MATCH SIMPLE (padrão do Postgres) não exige a FK quando
  -- responsavel_interno_id é null, então "sem responsável" continua
  -- permitido; quando preenchido, precisa ser um profile da mesma
  -- empresa.
  constraint event_suppliers_responsavel_company_fk
    foreign key (responsavel_interno_id, company_id) references profiles (id, company_id)
);

create index if not exists idx_event_suppliers_event on event_suppliers (event_id);
create index if not exists idx_event_suppliers_supplier on event_suppliers (supplier_id);
-- Toda policy filtra por company_id (+ event_id na consulta típica da
-- aba do evento) — índice composto evita full scan conforme a base
-- cresce, já que o custo de RLS escala com as linhas examinadas.
create index if not exists idx_event_suppliers_company_event on event_suppliers (company_id, event_id);

create table if not exists event_supplier_financials (
  event_supplier_id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  valor_previsto numeric(14, 2) check (valor_previsto is null or valor_previsto >= 0),
  valor_contratado numeric(14, 2) check (valor_contratado is null or valor_contratado >= 0),
  updated_at timestamptz not null default now(),
  constraint event_supplier_financials_link_company_fk
    foreign key (event_supplier_id, company_id) references event_suppliers (id, company_id) on delete cascade
);

create index if not exists idx_event_supplier_financials_company on event_supplier_financials (company_id);

-- ---------------------------------------------------------------------
-- Equipe do evento (alocação de usuários já cadastrados na empresa)
-- ---------------------------------------------------------------------

create type team_member_status as enum ('convidado', 'confirmado', 'em_atividade', 'concluido', 'cancelado');

create table if not exists event_team_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  event_id uuid not null,
  user_id uuid not null,
  funcao text not null,
  responsabilidade text,
  escala text,
  status team_member_status not null default 'convidado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Mesma pessoa não pode ser alocada duas vezes ao mesmo evento
  -- (a aplicação também valida isso antes do insert).
  unique (event_id, user_id),
  constraint event_team_members_event_company_fk
    foreign key (event_id, company_id) references events (id, company_id) on delete cascade,
  constraint event_team_members_user_company_fk
    foreign key (user_id, company_id) references profiles (id, company_id)
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

-- ---------------------------------------------------------------------
-- Privilégios explícitos na Data API (PostgREST)
--
-- O 7Eventos só acessa o Postgres pelo cliente de serviço no servidor
-- (src/lib/data/supabase/client.ts, role service_role). Nenhum código do
-- produto usa um client Supabase no navegador com JWT de usuário para
-- consultar estas tabelas (a anon key documentada em .env.example
-- serve só para auth.signInWithPassword em src/lib/auth/actions.ts,
-- dentro de uma Server Action — nunca chega ao bundle do cliente).
-- service_role IGNORA RLS (BYPASSRLS), mas isso não dispensa GRANT —
-- RLS e privilégios são camadas independentes, e o PostgREST aplica os
-- privilégios normais do Postgres antes de chegar às policies. Como a
-- exposição de tabelas via Data API passou a ser opt-in em projetos
-- novos do Supabase (privilégios automáticos desativados), sem GRANT
-- explícito o service_role recebe "42501 permission denied for table"
-- ao acessar via PostgREST. Por isso: REVOKE explícito de
-- "authenticated"/"anon" (ninguém no navegador acessa direto) e GRANT
-- explícito para "service_role" (é assim que o backend acessa) — a
-- intenção "só o backend acessa" fica registrada no schema, e não
-- depende de nenhuma opção do painel do Supabase.
-- ---------------------------------------------------------------------

revoke all on suppliers, event_suppliers, event_supplier_financials, event_team_members
  from authenticated, anon;

grant select, insert, update, delete on
  suppliers,
  event_suppliers,
  event_supplier_financials,
  event_team_members
  to service_role;
