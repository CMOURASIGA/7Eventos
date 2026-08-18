# RES-002 - Disponibilidade e conflitos

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
Determinar disponibilidade de espaço por período e capacidade.

## Escopo
Consulta por empresa, espaço, intervalo, capacidade e status.

## Fora do escopo
Funcionalidades exclusivas das Fases 2, 3 e 4, salvo dependência explicitamente aprovada.

## Perfis e autorização
Aplicar `AUTHORIZATION.md` e restringir também na camada de serviço/dados.

## Frontend
Seguir `DESIGN_SYSTEM.md`, incluindo loading, vazio, erro, sucesso e responsividade quando aplicável.

## Backend/Domínio
Conflito: inicio_existente < fim_novo AND fim_existente > inicio_novo; canceladas não bloqueiam.

## Dados
Aplicar `DATABASE.md` e `MULTITENANCY.md` quando houver persistência.

## Segurança e auditoria
Validar tenant, perfil e entradas no servidor. Registrar auditoria quando a operação for relevante segundo `AUDIT.md`.

## Critérios de aceite
- [ ] AC01 Conflito ativo é detectado
- [ ] AC02 Reserva cancelada não bloqueia
- [ ] AC03 Espaço inativo é indisponível
- [ ] AC04 Consulta respeita tenant

## Testes mínimos
- Unit: regras determinísticas da feature.
- Integration: persistência, autorização e tenant quando aplicável.
- E2E: fluxo principal quando a infraestrutura do projeto suportar.

## Definição de pronto
Implementado, testes disponíveis aprovados, lint/typecheck/build aprovados, sem erro relevante de console, critérios de aceite verificados e documentação atualizada.
