# Modelo de Dados - Diretrizes

## Entidades mínimas da Fase 1
Company, User, Event, EventSession, Space, Reservation, ChecklistItem, Budget, ComplexityAssessment e AuditLog.

## Regras
- Entidades operacionais devem possuir `company_id`.
- Chaves e relacionamentos devem preservar isolamento entre empresas.
- Datas devem ser armazenadas de forma consistente e convertidas para apresentação conforme timezone definido pelo produto.
- Remoção física deve ser evitada quando prejudicar auditoria.
- Regras de conflito, capacidade e autorização não devem depender somente da UI.
- Índices devem cobrir filtros recorrentes por empresa, status, período e relacionamentos.

## Relações conceituais
- Company 1:N Users
- Company 1:N Events
- Event 1:N EventSessions
- Company 1:N Spaces
- Space 1:N Reservations
- Event 0..1:N Reservations
- Event 1:N ChecklistItems
- Event 0..1:1 Budget inicial
- Event 0..1:N ComplexityAssessments/histórico conforme desenho final
- Company/User 1:N AuditLogs

O esquema físico final deve ser documentado após confirmação da tecnologia de persistência existente.
