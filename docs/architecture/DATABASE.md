# Banco de dados - 7Eventos (Fase 1)

## Status atual

**Nenhum projeto Supabase foi provisionado ainda.** Por decisão do
responsável pelo produto (2026-08-20), o desenvolvimento da Fase 1
priorizou primeiro o produto completo rodando sobre uma base de
demonstração rica (`DATA_MODE=mock`, branch `develop`), deixando o
schema Postgres/Supabase pronto e documentado para quando o ambiente
oficial for criado.

Quando o projeto Supabase existir:

1. Criar o projeto (região `sa-east-1`, mesma região do `7Commander_oficial`, recomendado).
2. Aplicar as migrations em ordem, via Supabase CLI ou MCP:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_row_level_security.sql`
3. Criar os primeiros usuários via Supabase Auth e inserir a linha
   correspondente em `profiles` (o `id` do profile é o mesmo `id` do
   `auth.users`).
4. Definir as variáveis de ambiente (`.env.example`) com `DATA_MODE=supabase`
   e as chaves do projeto.
5. Nenhuma alteração de código é necessária: a camada de dados
   (`src/lib/data`) já implementa as duas fontes atrás da mesma
   interface (`src/lib/data/repository.ts`).

## Modelo de dados

Entidades da Fase 1 (ver `src/lib/domain/types.ts` para os tipos de
domínio em TypeScript e `supabase/migrations/0001_initial_schema.sql`
para o schema físico):

| Entidade | Tabela | Observações |
|---|---|---|
| Empresa | `companies` | Nenhum vínculo com `company_id` (é a raiz do isolamento). |
| Usuário/Perfil | `profiles` | `id` referencia `auth.users.id`. `company_id` obrigatório exceto para `superadmin`. |
| Espaço | `spaces` | `company_id` obrigatório. |
| Evento | `events` | `company_id` obrigatório. `space_id` opcional (localização externa). |
| Sessão do evento | `event_sessions` | 1:N com `events`. Suporta múltiplas sessões/recorrência. |
| Histórico de status | `event_status_history` | Append-only, nunca editado/apagado (RN09). |
| Reserva | `reservations` | `event_id` opcional até conversão (reserva rápida, RN07). |
| Checklist | `checklist_items` | 1:N com `events`. |
| Orçamento | `budgets` | 1:1 com `events` (`unique(event_id)`). |
| Complexidade | `complexity_assessments` | Histórico de avaliações (1:N), última = vigente. |
| Auditoria | `audit_logs` | Append-only. |

## Isolamento multiempresa (RN01)

Duas camadas independentes, nenhuma delas dispensável:

1. **Aplicação**: toda função de `src/lib/data/supabase/repository.ts`
   filtra explicitamente por `company_id` da sessão autenticada antes
   de ler/gravar.
2. **RLS** (`supabase/migrations/0002_row_level_security.sql`): mesmo
   que a aplicação tenha um bug, uma policy de Postgres barra o
   acesso cruzado entre empresas. As policies usam `auth.uid()` e a
   tabela `profiles` para resolver `company_id`/perfil do usuário
   autenticado.

Nota: a implementação server-side usa a **service role key** (que
ignora RLS) para poder aplicar as regras de permissão mais finas da
matriz de `src/lib/domain/permissions.ts` (que distingue por
capacidade, não só por "é da empresa ou não"). Por isso o filtro
explícito por `company_id` em cada query da aplicação é obrigatório,
não apenas defesa em profundidade.

## Conflito de reservas (RN02/RN03/RN04)

- Validação de aplicação: `src/lib/domain/availability.ts`, chamada
  por ambas as implementações do repositório antes de criar uma
  reserva.
- Defesa adicional no banco: índice GiST sobre `(space_id, periodo)` em
  `reservations` (coluna gerada `tstzrange(inicio, fim, '[)')`), que
  permite evoluir para uma `EXCLUDE CONSTRAINT` real caso o produto
  decida bloquear conflitos também no nível de banco no futuro.

## Base de demonstração (`DATA_MODE=mock`)

- Gerada por `src/lib/data/mock/seed.ts` (determinística, mesma seed
  sempre) e mantida em memória por `src/lib/data/mock/store.ts`.
- Reiniciar o processo do servidor restaura o estado inicial. Também é
  possível restaurar manualmente pelo botão "Restaurar dados de demo"
  no cabeçalho da aplicação (`resetDemoData`, em
  `src/lib/data/mock/actions.ts`).
- Nunca deve ser usada com `DATA_MODE=supabase` nem em produção.
