# DASH-001 - Dashboard da Fase 1

**Fase:** 1  
**Status:** READY  
**Prioridade:** HIGH

## requires
- `docs/01-architecture/ARCHITECTURE.md`
- `docs/01-architecture/MULTITENANCY.md`
- `docs/01-architecture/AUTHORIZATION.md`
- `docs/01-architecture/DEVELOPMENT_RULES.md`
- `docs/02-design/DESIGN_SYSTEM.md`

## Objetivo
Exibir indicadores reais do escopo Fase 1.

## Escopo
Eventos, próximos, status, categoria, complexidade, estratégicos, reservas, orçamento e ocupação quando calculável.

## Fora do escopo
Funcionalidades exclusivas das Fases 2, 3 e 4, salvo dependência explicitamente aprovada.

## Perfis e autorização
Aplicar `AUTHORIZATION.md` e restringir também na camada de serviço/dados.

## Frontend
Seguir `DESIGN_SYSTEM.md`, incluindo loading, vazio, erro, sucesso e responsividade quando aplicável.

## Backend/Domínio
Filtros por período e tenant devem ser consistentes.

## Dados
Aplicar `DATABASE.md` e `MULTITENANCY.md` quando houver persistência.

## Segurança e auditoria
Validar tenant, perfil e entradas no servidor. Registrar auditoria quando a operação for relevante segundo `AUDIT.md`.

## Critérios de aceite
- [ ] AC01 Sem mocks em produção
- [ ] AC02 Indicadores respeitam período
- [ ] AC03 Indicadores respeitam empresa
- [ ] AC04 Loading/vazio/erro tratados

## Testes mínimos
- Unit: regras determinísticas da feature.
- Integration: persistência, autorização e tenant quando aplicável.
- E2E: fluxo principal quando a infraestrutura do projeto suportar.

## Definição de pronto
Implementado, testes disponíveis aprovados, lint/typecheck/build aprovados, sem erro relevante de console, critérios de aceite verificados e documentação atualizada.
