# Arquitetura do 7Eventos

## Princípios obrigatórios
- SaaS multiempresa desde a fundação.
- Separação entre UI, domínio, persistência e serviços.
- Regras críticas centralizadas e nunca protegidas apenas pelo frontend.
- Migrations versionadas quando houver banco relacional/mecanismo equivalente.
- Segredos fora do frontend.
- Integrações externas desacopladas por serviços/adapters.
- Atlas desacoplado do domínio e sujeito à mesma autorização do usuário.

## Stack
A stack definitiva deve ser confirmada no gap analysis do repositório antes da primeira implementação. Este documento não autoriza troca de framework, banco, autenticação ou infraestrutura sem ADR.

## Camadas conceituais
`UI -> Application/Services -> Domain Rules -> Persistence`

Para IA:
`UI -> Atlas Service -> Authorization -> Context Builder -> Model -> Tool Validation -> Domain Service -> Audit`

Para integrações:
`Domain -> Integration Service -> Adapter -> External Provider`

## Regra de alteração
Mudança estrutural relevante exige ADR antes do código.
