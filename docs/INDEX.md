# 7Eventos - Índice de Engenharia e Execução

## Propósito
Este arquivo é o ponto de entrada obrigatório para qualquer agente, desenvolvedor ou revisor que trabalhe no 7Eventos.

A documentação é organizada para evitar leitura desnecessária de todo o repositório e reduzir ambiguidade, retrabalho e consumo de contexto.

## Regra de entrada
1. Leia este `INDEX.md`.
2. Identifique a SPEC solicitada.
3. Leia somente os documentos listados no campo `requires` da SPEC.
4. Inspecione somente o código relacionado à SPEC e às suas dependências.
5. Não implemente itens fora da SPEC ativa.
6. Não antecipe outra fase.
7. Ao concluir, execute os critérios de aceite e validações técnicas.

## Fontes de verdade
- Produto: `00-product/PRODUCT_SPEC.md`
- Roadmap: `00-product/PRODUCT_ROADMAP.md`
- Arquitetura: `01-architecture/ARCHITECTURE.md`
- Dados: `01-architecture/DATABASE.md`
- Multiempresa: `01-architecture/MULTITENANCY.md`
- Autorização: `01-architecture/AUTHORIZATION.md`
- Segurança: `01-architecture/SECURITY.md`
- Auditoria: `01-architecture/AUDIT.md`
- Regras de desenvolvimento: `01-architecture/DEVELOPMENT_RULES.md`
- Design: `02-design/DESIGN_SYSTEM.md`
- Atlas: `03-ai/ATLAS_ARCHITECTURE.md`
- Fases: `phases/`
- Execução granular: `specs/`
- Decisões arquiteturais: `adr/`

## Fluxo de uma SPEC
`DRAFT -> READY -> IN_DEVELOPMENT -> IMPLEMENTED -> TESTED -> VALIDATED -> DONE`

Somente uma SPEC `READY` deve entrar em desenvolvimento. O agente pode mover para `IMPLEMENTED` e `TESTED`, mas `VALIDATED` e `DONE` exigem validação do responsável pelo produto.

## Ordem da Fase 1
1. AUTH-001 Login e sessão
2. AUTH-002 Proteção de rotas
3. AUTH-003 Perfis e autorização
4. TEN-001 Isolamento multiempresa
5. DASH-001 Dashboard
6. SPC-001 Cadastro de espaços
7. SPC-002 Busca e inativação de espaços
8. RES-001 Reserva rápida
9. RES-002 Disponibilidade e conflitos
10. EVT-001 Criar evento
11. EVT-002 Editar evento
12. EVT-003 Buscar eventos
13. EVT-004 Detalhe do evento
14. EVT-005 Sessões e ciclo de vida
15. AGD-001 Agenda
16. PLN-001 Checklist e planejamento
17. CMP-001 Complexidade
18. FIN-001 Orçamento básico
19. REP-001 Relatórios iniciais
20. AUD-001 Auditoria operacional
21. VAL-001 Validação final da Fase 1

## Regra de término da Fase 1
A Fase 1 termina somente após `VAL-001` estar `DONE`. Nenhuma SPEC da Fase 2 deve ser iniciada antes disso.
