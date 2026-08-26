# Whitelabel e ambientes

## Identidade visual por empresa

O whitelabel utiliza `companies.configuracoes`, campo JSONB já criado na
migration `0001_initial_schema.sql`. Por isso, a personalização de cores
e URL da logo não exige uma nova migration.

Campos suportados:

- `corPrimaria`: menu lateral e ações principais;
- `corSecundaria`: foco, seleção e destaques;
- `logoUrl`: URL HTTPS ou caminho público interno;
- `fusoHorario`: configuração já existente.

A gravação passa por `Repository.companies.updateBranding`, exige a
capability `manage_company_settings`, valida os dados no servidor,
respeita `company_id` e registra auditoria. A interface fica em
`/administracao/identidade-visual`.

### Quando o Supabase for provisionado

1. Aplicar as migrations `0001` até `0007` na ordem documentada em
   `docs/architecture/DATABASE.md`.
2. Criar um bucket público ou uma política de URLs assinadas para logos.
3. Fazer upload das logos usando nomes isolados por empresa, por exemplo
   `companies/<company_id>/branding/logo.png`.
4. Gravar a URL resultante em `companies.configuracoes.logoUrl` pela tela
   administrativa.
5. Definir limites de tipo e tamanho no upload quando o upload direto for
   implementado. A entrega atual usa URL para não criar dependência de
   Storage antes do provisionamento.

## Branches e configuração Vercel

| Ambiente | Branch | `DATA_MODE` | Dados |
|---|---|---|---|
| Produção | `main` | `supabase` | Reais, somente após provisionamento |
| Desenvolvimento | `develop` | `mock` inicialmente | Fictícios até existir Supabase de desenvolvimento |
| Demonstração | `demo` | `mock` obrigatório | Fictícios, completos e reiniciáveis |

Na Vercel, criar um projeto ou domínio de demonstração apontado para
`demo`. Não promover o deploy de `demo` para Production. O ambiente
Production da branch `main` não deve ser liberado enquanto as variáveis
Supabase não existirem.

O código também falha de forma segura se `VERCEL_ENV=production` sem
`DATA_MODE=supabase`. Isso impede que uma ausência de variável publique
acidentalmente os dados mockados como ambiente oficial.

Variáveis mínimas:

- `main`: `DATA_MODE=supabase`, `SESSION_SECRET`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` e
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- `develop`: `DATA_MODE=mock`, `SESSION_SECRET` e chaves de integrações
  apenas no escopo Preview;
- `demo`: `DATA_MODE=mock`, `SESSION_SECRET` próprio e limites baixos do
  Atlas para controlar consumo durante apresentações.
