# ADR-005-integration-adapters - Integrações por adapters

**Status:** ACCEPTED

## Decisão
Integrações externas serão desacopladas do domínio por serviço e adapter.

## Motivo
Mantém o núcleo funcional mesmo quando o provedor externo falha ou muda.

## Consequência
Implementações futuras devem respeitar esta decisão. Mudança exige novo ADR que substitua explicitamente este registro.
