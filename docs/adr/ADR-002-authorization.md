# ADR-002-authorization - Autorização além da interface

**Status:** ACCEPTED

## Decisão
Permissões serão validadas também na camada de serviço/dados; ocultar menus não é segurança.

## Motivo
Protege acesso direto a rotas e APIs.

## Consequência
Implementações futuras devem respeitar esta decisão. Mudança exige novo ADR que substitua explicitamente este registro.
