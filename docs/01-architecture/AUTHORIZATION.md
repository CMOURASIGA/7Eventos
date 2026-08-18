# Autorização e Perfis

## Perfis
- Superadmin Consult Services
- Administrador da empresa
- Gestor de eventos
- Operador / Organizador
- Consulta

## Princípios
- Menu não é mecanismo de segurança.
- API/serviço/persistência deve validar permissão.
- Operações críticas devem ser negadas por padrão quando não houver autorização explícita.
- Toda SPEC deve declarar os perfis ou permissões necessários.

## Matriz inicial
| Capacidade | Admin empresa | Gestor | Operador | Consulta |
|---|---|---|---|---|
| Administrar usuários | Sim | Não | Não | Não |
| Criar/editar evento | Sim | Sim | Limitado quando autorizado | Não |
| Consultar evento | Sim | Sim | Sim, conforme escopo | Sim, conforme escopo |
| Administrar espaços | Sim | Conforme política | Limitado | Não |
| Criar reserva | Sim | Sim | Quando autorizado | Não |
| Atualizar checklist | Sim | Sim | Sim, conforme atribuição | Não |
| Consultar relatórios | Sim | Sim | Conforme política | Conforme política |

A matriz pode ser refinada por SPEC sem reduzir as proteções globais.
