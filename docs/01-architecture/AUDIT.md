# Auditoria

## Registrar quando aplicável
criação, edição, mudança de status, reserva, cancelamento, conclusão, alterações de usuário/perfil e inativações.

## Campos mínimos
`company_id`, `user_id`, ação, entidade, `entity_id`, timestamp e metadados essenciais.

## Regras
- Auditoria não deve ser editável por usuários operacionais.
- Não persistir conteúdo sensível desnecessário.
- Alterações críticas por Atlas devem indicar origem IA, proposta e confirmação humana quando aplicável.
