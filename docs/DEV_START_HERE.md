# DEV START HERE

Você está trabalhando no Consult Services 7Eventos.

## Antes de qualquer código
1. Leia `docs/INDEX.md`.
2. Leia a SPEC que foi explicitamente solicitada.
3. Leia somente os arquivos listados em `requires` pela SPEC.
4. Faça um gap analysis focado na SPEC e em suas dependências.
5. Não implemente funcionalidades fora dela.

## Durante
- Preserve arquitetura funcional existente.
- Não troque stack sem ADR e autorização.
- Respeite multiempresa, autorização, auditoria e Design System.
- Não antecipe fases.

## Ao concluir
- Execute lint.
- Execute TypeScript/typecheck quando aplicável.
- Execute testes disponíveis.
- Execute build.
- Verifique console e critérios de aceite.
- Informe arquivos alterados, migrations, testes, critérios atendidos e pendências.
- Marque no máximo `IMPLEMENTED` ou `TESTED`. `VALIDATED` e `DONE` dependem do responsável pelo produto.

## Início e fim
O início oficial do desenvolvimento é `AUTH-001`. O fim oficial da Fase 1 é `VAL-001 = DONE`. Fase 2 só começa após esse gate.
