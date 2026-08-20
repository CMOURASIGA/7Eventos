# ADR-001 - Stack técnica e estratégia de ambientes/branches

**Status:** Aceito
**Data:** 2026-08-20
**Decisão de:** Responsável pelo produto (Christian Moura), via sessão de desenvolvimento

## Contexto

`docs/7EVENTOS_SPEC.md` e `docs/01-architecture/ARCHITECTURE.md` (branch
`main`) exigem que a stack seja confirmada e registrada em ADR antes da
primeira implementação. O repositório tinha apenas documentação, sem
código, em três branches: `main`, `develop` e
`claude/eventos-feature-dev-eiz4b5`.

## Decisão

### Stack

- **Next.js (App Router) + TypeScript + Tailwind CSS**, mesmo padrão
  usado pelos demais produtos Consult Services (7Commander, 7Finance).
- **Supabase** (Postgres + Auth + Row Level Security) como
  persistência e autenticação do ambiente oficial.
- Deploy alvo: **Vercel**.

### Camada de dados dupla (mock/demo x Supabase/oficial)

Toda a aplicação depende exclusivamente da interface
`src/lib/data/repository.ts`. Duas implementações completas existem
atrás dela:

- `src/lib/data/mock/*`: estado em memória, com base de demonstração
  rica e determinística (`seed.ts`), pensada para apresentações
  comerciais. Reiniciar o processo restaura o estado inicial.
- `src/lib/data/supabase/*`: Postgres real via Supabase, com as mesmas
  regras de negócio e autorização aplicadas antes de qualquer leitura
  ou escrita.

A variável `DATA_MODE` (`mock` | `supabase`) escolhe a implementação em
tempo de execução — nenhuma tela precisa saber qual fonte está ativa.

**Justificativa:** o responsável pelo produto priorizou ter o sistema
completo demonstrável imediatamente, sem esperar o provisionamento de
infraestrutura Supabase, mas sem pagar o custo de reescrever a camada
de dados depois. O schema Postgres e as policies de RLS já foram
escritos e documentados (`supabase/migrations/`,
`docs/architecture/DATABASE.md`) para aplicação posterior sem
retrabalho de UI.

### Estratégia de branches

| Branch | Papel |
|---|---|
| `main` | Base oficial do sistema. Não recebe commits diretos desta sessão; só merge após aprovação explícita. |
| `develop` | Ambiente de demonstração (`DATA_MODE=mock`), com dados fictícios ricos e reiniciáveis, usado para apresentações comerciais. |
| `claude/eventos-feature-dev-eiz4b5` | Branch de desenvolvimento real. Todo o código desta fase foi implementado aqui. |

## Consequências

- Nenhum dado fictício chega a `main`/produção (RN da Fase 1: "não
  utilizar dados fictícios em produção") — o modo mock é uma
  implementação de infraestrutura isolada, nunca ativada por padrão em
  produção.
- Ativar o ambiente oficial é uma mudança de configuração
  (`DATA_MODE=supabase` + variáveis de conexão), não uma reescrita de
  código.
- Login no modo demonstração é simplificado (seleção do usuário
  semeado, sem senha) — está claramente identificado na tela como
  ambiente de demonstração. O modo Supabase usa e-mail/senha reais via
  Supabase Auth.
