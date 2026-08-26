# ADR-001-multitenancy - Multiempresa desde a fundação

**Status:** ACCEPTED

## Decisão
Toda entidade operacional deve ser vinculada ao tenant e toda consulta/alteração deve respeitar o contexto autenticado.

## Motivo
Evita vazamento entre empresas e prepara o produto para licenciamento SaaS.

## Consequência
Implementações futuras devem respeitar esta decisão. Mudança exige novo ADR que substitua explicitamente este registro.
