# VAL-001 - Gate de validação da Fase 1

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
Validar o MVP completo antes de autorizar Fase 2.

## Escopo
Fluxos funcionais, multiempresa, perfis, dados reais, UX, lint, typecheck, testes, build, console e responsividade.

## Fora do escopo
Funcionalidades exclusivas das Fases 2, 3 e 4, salvo dependência explicitamente aprovada.

## Perfis e autorização
Aplicar `AUTHORIZATION.md` e restringir também na camada de serviço/dados.

## Frontend
Seguir `DESIGN_SYSTEM.md`, incluindo loading, vazio, erro, sucesso e responsividade quando aplicável.

## Backend/Domínio
Nenhuma SPEC da Fase 2 inicia enquanto este gate não estiver DONE.

## Dados
Aplicar `DATABASE.md` e `MULTITENANCY.md` quando houver persistência.

## Segurança e auditoria
Validar tenant, perfil e entradas no servidor. Registrar auditoria quando a operação for relevante segundo `AUDIT.md`.

## Critérios de aceite
- [ ] AC01 Todas as SPECs anteriores estão ao menos TESTED
- [ ] AC02 Critérios globais da Fase 1 aprovados
- [ ] AC03 Build aprovado
- [ ] AC04 Sem erros relevantes de console
- [ ] AC05 Validação do produto registrada

## Testes mínimos
- Unit: regras determinísticas da feature.
- Integration: persistência, autorização e tenant quando aplicável.
- E2E: fluxo principal quando a infraestrutura do projeto suportar.

## Definição de pronto
Implementado, testes disponíveis aprovados, lint/typecheck/build aprovados, sem erro relevante de console, critérios de aceite verificados e documentação atualizada.
