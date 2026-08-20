# 7Eventos

Plataforma SaaS multiempresa Consult Services para planejar, organizar,
executar e acompanhar eventos. **Planeje. Organize. Execute. Aprenda.**

A especificação funcional e técnica completa está em `docs/` — comece
por [`docs/7EVENTOS_SPEC.md`](docs/7EVENTOS_SPEC.md) e
[`docs/FASE_01_MVP.md`](docs/FASE_01_MVP.md).

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres,
Auth, RLS). Ver [`docs/adr/ADR-001-stack-e-ambientes.md`](docs/adr/ADR-001-stack-e-ambientes.md).

## Ambientes / branches

| Branch | Fonte de dados | Uso |
|---|---|---|
| `main` | Supabase (oficial) | Base oficial do sistema. |
| `develop` | Mock (demonstração) | Demonstrações comerciais com dados fictícios ricos e reiniciáveis. |
| `claude/eventos-feature-dev-eiz4b5` | Ambas (configurável) | Desenvolvimento. |

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # DATA_MODE=mock já funciona sem nenhuma configuração extra
npm run dev
```

Abra http://localhost:3000 — a tela de login lista os usuários de
demonstração (uma empresa "Consult Eventos Brasil" e outra "Aurora
Live", cada uma com usuários em todos os perfis).

Para restaurar a base de demonstração ao estado inicial a qualquer
momento, use o botão **"Restaurar dados de demo"** no cabeçalho da
aplicação (ou reinicie o servidor).

### Ligando o Supabase oficial

Ver [`docs/architecture/DATABASE.md`](docs/architecture/DATABASE.md)
para o passo a passo de provisionamento, aplicação das migrations
(`supabase/migrations/`) e variáveis de ambiente.

## Scripts

```bash
npm run dev      # ambiente de desenvolvimento
npm run build    # build de produção
npm run start    # servir o build de produção
npm run lint     # ESLint
```
