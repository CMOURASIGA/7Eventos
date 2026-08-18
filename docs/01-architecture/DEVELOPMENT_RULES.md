# Regras de Desenvolvimento

1. Começar por `docs/INDEX.md`.
2. Implementar uma SPEC por vez, salvo autorização explícita para lote relacionado.
3. Não reescrever código funcional sem justificativa.
4. Não alterar arquitetura sem ADR.
5. Não antecipar fases.
6. Não usar mocks/dados fictícios em produção.
7. Centralizar regras de negócio críticas.
8. Preservar tipos e contratos existentes.
9. Tratar loading, vazio, sucesso e erro.
10. Não usar `alert()` nativo para mensagens de negócio.
11. Executar lint, typecheck/TypeScript, testes e build disponíveis.
12. Não publicar em produção ou branch protegida sem autorização explícita.
13. Ao finalizar, informar arquivos alterados, migrations, testes executados, critérios de aceite e pendências reais.

## Controle de contexto
O agente não deve reler toda a documentação por padrão. Deve ler `INDEX.md`, a SPEC ativa e somente os documentos indicados em `requires`.
