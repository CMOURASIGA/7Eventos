-- 7Eventos - Fase 2 (Gestão Completa do Evento) - Fatia 2: Cronograma + Documentos
--
-- Fonte de verdade funcional: docs/FASE_02_GESTAO.md seções 4 e 5.
--
-- Este arquivo NÃO foi aplicado a nenhum projeto Supabase ainda (assim
-- como 0001/0002/0003). Documenta o schema alvo para quando o ambiente
-- oficial for provisionado — nessa hora, a validação operacional (rodar
-- os advisors de segurança/performance e testar o PostgREST real) é
-- feita como parte da implantação, não deste trabalho de preparação.
-- Como as demais migrations deste projeto, é escrita para rodar uma
-- única vez via `supabase db push` (histórico controlado por
-- supabase_migrations.schema_migrations) — não como script reaplicável;
-- por isso segue o mesmo padrão não-idempotente de 0001/0002/0003 para
-- tipos/triggers/policies (create type / create trigger / create policy
-- sem guarda), enquanto as tabelas mantêm "if not exists" por segurança
-- adicional em reaplicação manual.

-- ---------------------------------------------------------------------
-- Cronograma operacional
--
-- event_id/responsavel_id/depende_de_id são FK compostas contra
-- (id, company_id) das tabelas referenciadas, mesmo raciocínio de
-- 0003_fase2_fornecedores_equipe.sql: o cliente de serviço usado pelo
-- backend ignora RLS, então uma FK simples deixaria gravar company_id
-- de uma empresa com, por exemplo, event_id de outra. depende_de_id
-- referencia a própria tabela (outra atividade do mesmo evento) — por
-- isso a FK só é declarável depois de schedule_items_id_company_unique,
-- definida no mesmo CREATE TABLE.
-- ---------------------------------------------------------------------

create type schedule_item_status as enum ('pendente', 'em_andamento', 'concluido', 'cancelado');
create type schedule_item_priority as enum ('baixa', 'media', 'alta');

create table if not exists schedule_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  event_id uuid not null,
  titulo text not null,
  descricao text,
  inicio timestamptz not null,
  fim timestamptz not null,
  responsavel_id uuid,
  depende_de_id uuid,
  prioridade schedule_item_priority not null default 'media',
  status schedule_item_status not null default 'pendente',
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_items_fim_apos_inicio check (fim > inicio),
  -- Base para a FK composta de depende_de_id, abaixo (auto-referência).
  constraint schedule_items_id_company_unique unique (id, company_id),
  constraint schedule_items_event_company_fk
    foreign key (event_id, company_id) references events (id, company_id) on delete cascade,
  -- Nullable: MATCH SIMPLE (padrão do Postgres) não exige a FK quando a
  -- coluna é null, então "sem responsável definido" continua permitido;
  -- quando preenchido, precisa ser um profile da mesma empresa.
  constraint schedule_items_responsavel_company_fk
    foreign key (responsavel_id, company_id) references profiles (id, company_id),
  -- Mesma lógica MATCH SIMPLE: "sem dependência" é o padrão; quando
  -- preenchido, a atividade referenciada precisa ser da mesma empresa
  -- (não necessariamente do mesmo evento — isso a aplicação valida, já
  -- que o banco não tem como expressar "mesmo evento" via FK composta
  -- sem duplicar event_id nesta própria referência).
  constraint schedule_items_depende_de_company_fk
    foreign key (depende_de_id, company_id) references schedule_items (id, company_id)
);

create index if not exists idx_schedule_items_event on schedule_items (event_id);
-- Toda policy filtra por company_id (+ event_id na consulta típica da
-- aba do evento) — índice composto evita full scan conforme a base
-- cresce, já que o custo de RLS escala com as linhas examinadas.
create index if not exists idx_schedule_items_company_event on schedule_items (company_id, event_id);
create index if not exists idx_schedule_items_inicio on schedule_items (inicio);

-- ---------------------------------------------------------------------
-- Documentos do evento
--
-- Central documental por evento (docs/FASE_02_GESTAO.md seção 5). Sem um
-- provedor de armazenamento de arquivos provisionado ainda, esta tabela
-- guarda metadados + uma referência (url_referencia/nome_arquivo) em vez
-- de um blob binário — trocar por upload real (ex: Supabase Storage) no
-- futuro é uma migration adicional que não muda o restante do schema.
-- "status"/"arquivado_em" implementam a exclusão lógica pedida na spec:
-- nunca fazemos DELETE físico de um documento por aqui.
-- ---------------------------------------------------------------------

create type event_document_category as enum (
  'proposta',
  'contrato',
  'autorizacao',
  'planta',
  'apresentacao',
  'briefing',
  'evidencia',
  'fornecedor',
  'outros'
);
create type event_document_status as enum ('ativo', 'arquivado');

create table if not exists event_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  event_id uuid not null,
  categoria event_document_category not null,
  titulo text not null,
  descricao text,
  url_referencia text,
  nome_arquivo text,
  responsavel_id uuid not null,
  status event_document_status not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  arquivado_em timestamptz,
  constraint event_documents_id_company_unique unique (id, company_id),
  constraint event_documents_event_company_fk
    foreign key (event_id, company_id) references events (id, company_id) on delete cascade,
  -- responsavel_id é obrigatório ("usuário responsável" na spec) — sem
  -- MATCH SIMPLE relevante aqui, sempre precisa ser um profile da mesma
  -- empresa.
  constraint event_documents_responsavel_company_fk
    foreign key (responsavel_id, company_id) references profiles (id, company_id)
);

create index if not exists idx_event_documents_event on event_documents (event_id);
create index if not exists idx_event_documents_company_event on event_documents (company_id, event_id);
create index if not exists idx_event_documents_status on event_documents (company_id, status);

-- ---------------------------------------------------------------------
-- updated_at automático (mesmo padrão de 0001/0003)
-- ---------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['schedule_items', 'event_documents']
  loop
    execute format(
      'create trigger set_updated_at before update on %I for each row execute function set_updated_at()',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security (mesmo padrão de 0002/0003): isolamento por
-- company_id, escrita liberada para perfis diferentes de "consulta" e
-- restrita a Admin/Gestor/Operador (manage_schedule/manage_documents em
-- src/lib/domain/permissions.ts — mesmo grupo de manage_checklist).
-- Toda policy é escopada "to authenticated": ainda que um papel anônimo
-- normalmente nem resolva empresa/perfil, restringir explicitamente ao
-- papel autenticado é a orientação atual do Supabase para RLS, em vez
-- de depender só do predicado de autorização.
-- ---------------------------------------------------------------------

alter table schedule_items enable row level security;
alter table event_documents enable row level security;

create policy schedule_items_select on schedule_items for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy schedule_items_write on schedule_items for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() <> 'consulta')
  with check (company_id = current_profile_company_id() and current_profile_role() <> 'consulta');

create policy event_documents_select on event_documents for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy event_documents_write on event_documents for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() <> 'consulta')
  with check (company_id = current_profile_company_id() and current_profile_role() <> 'consulta');

-- ---------------------------------------------------------------------
-- Privilégios explícitos na Data API (PostgREST)
--
-- Mesmo raciocínio de 0002/0003: o 7Eventos só acessa o Postgres pelo
-- cliente de serviço no servidor (role service_role). service_role
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

revoke all on schedule_items, event_documents from authenticated, anon;

grant select, insert, update, delete on schedule_items, event_documents to service_role;
