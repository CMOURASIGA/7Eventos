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
-- (src/lib/data/supabase/client.ts, role service_role); nenhum client
-- Supabase no navegador consulta estas tabelas com JWT de usuário.
-- service_role IGNORA RLS (BYPASSRLS), mas isso não dispensa GRANT —
-- RLS e privilégios são camadas independentes, e o PostgREST resolve a
-- role da requisição (anon/authenticated/service_role) e então aplica
-- os privilégios normais do Postgres antes de sequer chegar às
-- policies. Como a exposição de tabelas via Data API passou a ser
-- opt-in em projetos novos do Supabase (privilégios automáticos
-- desativados), sem GRANT explícito o service_role recebe
-- "42501 permission denied for table" ao tentar acessar via PostgREST.
-- Por isso: REVOKE explícito de "authenticated"/"anon" (ninguém no
-- navegador acessa direto) e GRANT explícito para "service_role" (é
-- assim que o backend acessa). companies/profiles ficam de fora do
-- REVOKE: o próprio login (Supabase Auth) e telas de perfil podem
-- precisar de acesso autenticado a elas no futuro, então mantemos a
-- decisão explícita só nas tabelas puramente operacionais — mas
-- recebem o GRANT a service_role normalmente, junto com as demais.
-- ---------------------------------------------------------------------

revoke all on spaces, events, event_sessions, event_status_history, reservations,
  checklist_items, budgets, complexity_assessments, audit_logs
  from authenticated, anon;

grant usage on schema public to service_role;

grant select, insert, update, delete on
  companies,
  profiles,
  spaces,
  events,
  event_sessions,
  event_status_history,
  reservations,
  checklist_items,
  budgets,
  complexity_assessments,
  audit_logs
  to service_role;
