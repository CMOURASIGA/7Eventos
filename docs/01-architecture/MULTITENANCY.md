# Multiempresa

## Regra central
Nenhum dado operacional pode ser retornado ou alterado sem considerar a empresa do usuário autenticado.

## Requisitos
- `company_id` obrigatório em entidades operacionais.
- Usuário comum não escolhe livremente outro `company_id`.
- Filtro por empresa deve existir na camada de dados/serviço.
- Quando a tecnologia suportar políticas no banco, aplicar defesa adicional apropriada.
- IDs recebidos do cliente devem ser validados contra o tenant autenticado.
- Superadmin Consult Services permanece fora do contexto operacional normal.

## Teste obrigatório
Toda SPEC que manipula dados deve conter ao menos um teste de tentativa de acesso cruzado entre empresas.
