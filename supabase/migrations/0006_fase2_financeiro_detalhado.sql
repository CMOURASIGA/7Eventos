-- 7Eventos - Fase 2 (Gestão Completa do Evento) - Fatia 4a: Financeiro detalhado
--
-- Fonte de verdade funcional: docs/FASE_02_GESTAO.md seção 9.
--
-- Este arquivo NÃO foi aplicado a nenhum projeto Supabase ainda (assim
-- como 0001 a 0005). Documenta o schema alvo para quando o ambiente
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
--
-- Evolui `budgets` (0001_initial_schema.sql), que continua sendo o
-- cabeçalho (valor previsto total do evento); esta tabela é o
-- detalhamento linha a linha, mesmo raciocínio de suppliers ->
-- event_suppliers.

create type budget_item_status as enum ('previsto', 'cotado', 'contratado', 'realizado', 'cancelado');

create table if not exists budget_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  event_id uuid not null,
  categoria text not null,
  -- Nem todo item tem fornecedor associado (ex: taxas, equipe interna) —
  -- por isso nullable. Quando preenchido, FK composta contra
  -- (id, company_id) de suppliers, mesmo raciocínio das fatias
  -- anteriores: o cliente de serviço usado pelo backend ignora RLS,
  -- então uma FK simples deixaria gravar company_id de uma empresa com
  -- supplier_id de outra.
  supplier_id uuid,
  descricao text not null,
  valor_cotado numeric(14, 2) check (valor_cotado is null or valor_cotado >= 0),
  valor_contratado numeric(14, 2) check (valor_contratado is null or valor_contratado >= 0),
  valor_realizado numeric(14, 2) check (valor_realizado is null or valor_realizado >= 0),
  status budget_item_status not null default 'previsto',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_items_id_company_unique unique (id, company_id),
  constraint budget_items_event_company_fk
    foreign key (event_id, company_id) references events (id, company_id) on delete cascade,
  -- Nullable: MATCH SIMPLE (padrão do Postgres) não exige a FK quando
  -- supplier_id é null; quando preenchido, precisa ser um fornecedor da
  -- mesma empresa.
  constraint budget_items_supplier_company_fk
    foreign key (supplier_id, company_id) references suppliers (id, company_id)
);

create index if not exists idx_budget_items_event on budget_items (event_id);
-- Toda policy filtra por company_id (+ event_id na consulta típica da
-- aba do evento) — índice composto evita full scan conforme a base
-- cresce, já que o custo de RLS escala com as linhas examinadas.
create index if not exists idx_budget_items_company_event on budget_items (company_id, event_id);
create index if not exists idx_budget_items_categoria on budget_items (company_id, categoria);

-- ---------------------------------------------------------------------
-- updated_at automático (mesmo padrão das migrations anteriores)
-- ---------------------------------------------------------------------

create trigger set_updated_at before update on budget_items for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security (mesmo padrão de "budgets" em
-- 0002_row_level_security.sql): leitura aberta a qualquer perfil
-- autenticado da empresa (a UI decide se mostra a aba "Orçamento"
-- conforme "view_financials"), escrita restrita a Admin/Gestor —
-- espelha exatamente budgets_select/budgets_write, já que budget_items
-- é o detalhamento da mesma informação financeira. Toda policy é
-- escopada "to authenticated": ainda que um papel anônimo normalmente
-- nem resolva empresa/perfil, restringir explicitamente ao papel
-- autenticado é a orientação atual do Supabase para RLS, em vez de
-- depender só do predicado de autorização.
-- ---------------------------------------------------------------------

alter table budget_items enable row level security;

create policy budget_items_select on budget_items for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy budget_items_write on budget_items for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'))
  with check (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'));

-- ---------------------------------------------------------------------
-- Privilégios explícitos na Data API (PostgREST)
--
-- Mesmo raciocínio de 0002 a 0005: o 7Eventos só acessa o Postgres pelo
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

revoke all on budget_items from authenticated, anon;

grant select, insert, update, delete on budget_items to service_role;
