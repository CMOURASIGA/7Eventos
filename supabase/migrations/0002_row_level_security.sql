-- 7Eventos - Row Level Security (RN01 - isolamento multiempresa, RN11 - permissões)
--
-- Defesa em profundidade: a aplicação já filtra por company_id e por
-- perfil em src/lib/data/supabase/*, mas RLS garante que mesmo uma
-- consulta direta ao banco (ou um bug na camada de aplicação) nunca
-- vaze dados entre empresas.
--
-- Convenção: `auth.uid()` identifica o usuário autenticado; o perfil e
-- a empresa dele são lidos de `profiles`.

create or replace function current_profile_company_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select company_id from profiles where id = auth.uid();
$$;

create or replace function current_profile_role()
returns user_role
language sql stable
security definer
set search_path = public
as $$
  select perfil from profiles where id = auth.uid();
$$;

create or replace function is_superadmin()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select coalesce(current_profile_role() = 'superadmin', false);
$$;

alter table companies enable row level security;
alter table profiles enable row level security;
alter table spaces enable row level security;
alter table events enable row level security;
alter table event_sessions enable row level security;
alter table event_status_history enable row level security;
alter table reservations enable row level security;
alter table checklist_items enable row level security;
alter table budgets enable row level security;
alter table complexity_assessments enable row level security;
alter table audit_logs enable row level security;

-- Toda policy abaixo é escopada "to authenticated": um papel anônimo
-- normalmente nem resolveria empresa/perfil (as funções acima
-- retornariam null), mas restringir explicitamente ao papel
-- autenticado é a orientação atual do Supabase para RLS, em vez de
-- depender só do predicado de autorização.

-- companies: superadmin vê todas; demais perfis veem apenas a própria empresa.
create policy companies_select on companies for select
  to authenticated
  using (is_superadmin() or id = current_profile_company_id());

-- profiles: usuário vê perfis da própria empresa; superadmin vê todos.
create policy profiles_select on profiles for select
  to authenticated
  using (is_superadmin() or company_id = current_profile_company_id());

create policy profiles_insert on profiles for insert
  to authenticated
  with check (
    is_superadmin()
    or (company_id = current_profile_company_id() and current_profile_role() = 'admin_empresa')
  );

create policy profiles_update on profiles for update
  to authenticated
  using (
    is_superadmin()
    or (company_id = current_profile_company_id() and current_profile_role() = 'admin_empresa')
  );

-- Tabelas operacionais: regra padrão idêntica em todas — isolamento por
-- company_id, com escrita liberada para perfis diferentes de "consulta".
-- (a validação fina de qual perfil pode fazer qual ação específica
-- também é aplicada em src/lib/domain/permissions.ts na camada de app).

create policy spaces_select on spaces for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy spaces_write on spaces for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() <> 'consulta')
  with check (company_id = current_profile_company_id() and current_profile_role() <> 'consulta');

create policy events_select on events for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy events_write on events for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() <> 'consulta')
  with check (company_id = current_profile_company_id() and current_profile_role() <> 'consulta');

create policy event_sessions_select on event_sessions for select
  to authenticated
  using (exists (select 1 from events e where e.id = event_id and e.company_id = current_profile_company_id()));
create policy event_sessions_write on event_sessions for all
  to authenticated
  using (exists (select 1 from events e where e.id = event_id and e.company_id = current_profile_company_id() and current_profile_role() <> 'consulta'))
  with check (exists (select 1 from events e where e.id = event_id and e.company_id = current_profile_company_id() and current_profile_role() <> 'consulta'));

create policy event_status_history_select on event_status_history for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy event_status_history_insert on event_status_history for insert
  to authenticated
  with check (company_id = current_profile_company_id() and current_profile_role() <> 'consulta');

create policy reservations_select on reservations for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy reservations_write on reservations for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() <> 'consulta')
  with check (company_id = current_profile_company_id() and current_profile_role() <> 'consulta');

create policy checklist_items_select on checklist_items for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy checklist_items_write on checklist_items for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() <> 'consulta')
  with check (company_id = current_profile_company_id() and current_profile_role() <> 'consulta');

create policy budgets_select on budgets for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy budgets_write on budgets for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'))
  with check (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'));

create policy complexity_assessments_select on complexity_assessments for select
  to authenticated
  using (company_id = current_profile_company_id());
create policy complexity_assessments_write on complexity_assessments for all
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'))
  with check (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'));

create policy audit_logs_select on audit_logs for select
  to authenticated
  using (company_id = current_profile_company_id() and current_profile_role() in ('admin_empresa', 'gestor_eventos'));
create policy audit_logs_insert on audit_logs for insert
  to authenticated
  with check (company_id = current_profile_company_id());

-- ---------------------------------------------------------------------
-- Privilégios explícitos na Data API (PostgREST)
--
-- O 7Eventos só acessa o Postgres pelo cliente de serviço no servidor
-- (src/lib/data/supabase/client.ts, service_role — sempre ignora RLS e
-- não depende de GRANT); nenhum client Supabase no navegador consulta
-- estas tabelas com JWT de usuário. Como a exposição de tabelas via
-- Data API passou a ser opt-in em projetos novos do Supabase (e pode
-- variar por configuração do projeto), revogamos explicitamente de
-- "authenticated"/"anon" em vez de confiar no default — a intenção
-- "só o backend acessa" fica registrada no schema, não numa opção do
-- painel. companies/profiles ficam de fora: o próprio login (Supabase
-- Auth) e telas de perfil podem precisar de acesso autenticado a elas
-- no futuro, então mantemos a decisão explícita só nas tabelas
-- puramente operacionais.
-- ---------------------------------------------------------------------

revoke all on spaces, events, event_sessions, event_status_history, reservations,
  checklist_items, budgets, complexity_assessments, audit_logs
  from authenticated, anon;
