# 7Eventos - Fase 1 - Fundação e MVP

**Versão:** 1.0\
**Documento mestre:** `7EVENTOS_SPEC.md`\
**Objetivo:** contrato de execução da primeira fase.

## 1. Resultado esperado

Entregar uma versão operacional do 7Eventos capaz de administrar
empresas, usuários, agenda, eventos, espaços, reservas, planejamento,
checklist, complexidade, orçamento básico, indicadores e auditoria.

A Fase 1 deve funcionar sem depender das Fases 2, 3 ou 4.

## 2. Ordem recomendada de implementação

1.  Analisar arquitetura e dependências atuais.
2.  Confirmar estratégia de autenticação e persistência.
3.  Estruturar multiempresa.
4.  Estruturar perfis e autorização.
5.  Criar/ajustar modelo de dados.
6.  Implementar cadastros auxiliares.
7.  Implementar Espaços.
8.  Implementar Reservas e disponibilidade.
9.  Implementar Eventos.
10. Implementar Agenda.
11. Implementar Checklist e planejamento.
12. Implementar Complexidade.
13. Implementar orçamento básico.
14. Implementar Dashboard.
15. Implementar Relatórios iniciais.
16. Implementar Auditoria.
17. Validar aplicação completa.

## 3. Multiempresa

Toda entidade operacional deve possuir `company_id`.

Requisitos:

-   usuário pertence a uma empresa;
-   consultas devem ser filtradas pela empresa autenticada;
-   usuário comum não pode escolher manualmente outro `company_id`;
-   autorização deve existir além da interface;
-   preparar arquitetura para licenciamento SaaS;
-   Superadmin Consult Services deve permanecer separado do contexto
    operacional normal.

## 4. Perfis

### Superadmin Consult Services

Administração global da plataforma.

### Administrador da empresa

Administra usuários, configurações e dados da empresa.

### Gestor de eventos

Cria, administra e acompanha eventos.

### Operador / Organizador

Executa atividades e atualiza informações permitidas.

### Consulta

Somente leitura.

Menus, ações e APIs devem respeitar o perfil.

## 5. Dashboard

### Indicadores mínimos

-   Total de eventos
-   Próximos eventos
-   Eventos por status
-   Eventos por categoria
-   Eventos por complexidade
-   Eventos estratégicos
-   Reservas por status
-   Eventos com orçamento
-   Eventos sem orçamento
-   Ocupação de espaços, quando calculável

### Regras

-   filtro por período;
-   dados reais;
-   respeitar empresa;
-   clique em indicador pode direcionar para listagem filtrada quando
    aplicável;
-   estados de carregamento, vazio e erro padronizados.

## 6. Agenda

### Visualizações

-   calendário mensal;
-   lista;
-   eventos do dia.

### Recursos

-   avançar/retroceder período;
-   ir para hoje;
-   filtros por temática, categoria, status, local e estratégico;
-   abrir detalhe;
-   identificação visual consistente;
-   múltiplas sessões de um evento devem aparecer corretamente.

## 7. Eventos

### Hub

Ações principais:

-   Novo Evento
-   Reserva Rápida
-   Ver Agenda
-   Buscar Eventos

### Busca

Filtros:

-   título/palavra-chave;
-   demandante;
-   data inicial/final;
-   status;
-   complexidade;
-   local;
-   temática;
-   estratégico.

Não mostrar "nenhum resultado" antes da primeira pesquisa.

### Cadastro

#### Informações Gerais

-   título obrigatório;
-   temática;
-   uma ou mais sessões com início/fim;
-   duração derivada quando possível;
-   frequência;
-   status;
-   localização interna/externa;
-   local;
-   espaço;
-   formato;
-   demandante;
-   contato;
-   categoria;
-   responsável;
-   parceiro;
-   descrição;
-   previsto em orçamento;
-   estratégico.

#### Detalhes e Planejamento

-   escopo;
-   segmento;
-   classificação;
-   público-alvo;
-   restrito;
-   planejamento;
-   jornada do participante;
-   checklist;
-   anexos se infraestrutura de arquivos fizer parte da fundação.

#### Reservas

-   listar reservas vinculadas;
-   criar reserva;
-   visualizar status;
-   consultar disponibilidade.

#### Complexidade

-   esforço;
-   impacto;
-   classificação;
-   memória dos fatores usados no cálculo.

### Detalhe do evento

Exibir visão consolidada:

-   dados gerais;
-   sessões;
-   localização;
-   planejamento;
-   reservas;
-   checklist;
-   orçamento;
-   complexidade;
-   histórico.

## 8. Espaços

### Cadastro

-   nome obrigatório;
-   local;
-   capacidade;
-   ativo/inativo;
-   descrição;
-   características;
-   equipamentos;
-   observações.

### Busca

Filtros:

-   local;
-   nome;
-   status;
-   capacidade.

### Regras

-   espaço inativo não recebe nova reserva;
-   validar tamanho dos textos;
-   sinalizar possíveis duplicidades;
-   preservar histórico de inativação.

## 9. Reserva rápida

Fluxo independente do cadastro completo de evento.

Campos:

1.  local;
2.  espaço;
3.  início;
4.  fim;
5.  quantidade de pessoas;
6.  motivo;
7.  solicitante.

Antes de confirmar:

-   validar datas;
-   verificar espaço ativo;
-   verificar capacidade;
-   verificar conflitos.

Uma reserva rápida poderá posteriormente ser associada ou convertida em
evento sem redigitação desnecessária.

## 10. Disponibilidade

A busca deve considerar:

-   empresa;
-   espaço;
-   período;
-   capacidade;
-   status do espaço;
-   reservas conflitantes.

Regra principal:

`inicio_existente < fim_novo AND fim_existente > inicio_novo`

Reservas canceladas não devem bloquear disponibilidade.

## 11. Checklist

Cada evento pode possuir itens com:

-   título;
-   categoria;
-   responsável;
-   prazo;
-   status;
-   observação;
-   data de conclusão.

Status sugeridos:

-   Pendente
-   Em andamento
-   Concluído
-   Bloqueado
-   Cancelado

Exibir percentual de conclusão.

## 12. Complexidade

Manter cálculo centralizado.

### Esforço

Pode considerar:

-   público-alvo;
-   espaço;
-   ativações;
-   serviços;
-   contratação;
-   legislação;
-   jornada do participante.

### Impacto

Pode considerar:

-   público;
-   autoridades;
-   cerimonial;
-   estratégico.

Persistir fatores e resultado para auditoria.

## 13. Orçamento básico

Campos:

-   evento;
-   previsto no orçamento;
-   valor previsto;
-   observação;
-   status.

Indicadores devem distinguir eventos com e sem orçamento.

Custos detalhados e realizado pertencem à Fase 2.

## 14. Relatórios

Filtros mínimos:

-   período;
-   status;
-   categoria;
-   complexidade;
-   espaço;
-   demandante;
-   estratégico;
-   orçamento.

A arquitetura deve permitir futura exportação em PDF/Excel/CSV.

## 15. Auditoria

Registrar:

-   login administrativo relevante;
-   criação;
-   edição;
-   alteração de status;
-   reserva;
-   cancelamento;
-   conclusão;
-   mudanças de usuário/perfil;
-   inativações.

Campos mínimos:

-   company_id;
-   user_id;
-   ação;
-   entidade;
-   entity_id;
-   timestamp;
-   metadados essenciais.

## 16. UX e padrão Consult Services

-   identidade visual da Consult Services;
-   predominância azul;
-   sidebar coerente com 7Commander/7Finance;
-   componentes consistentes;
-   sem `alert()` nativo para mensagens de negócio;
-   feedback central/padronizado;
-   skeleton/loading coerente;
-   estados vazios corretos;
-   responsividade;
-   acessibilidade básica.

## 17. Critérios de aceite

-   [ ] Login e logout funcionam.
-   [ ] Rotas protegidas.
-   [ ] Isolamento multiempresa validado.
-   [ ] Perfis restringem menus e ações.
-   [ ] Dashboard usa dados reais.
-   [ ] Agenda reflete eventos.
-   [ ] Evento completo pode ser criado e editado.
-   [ ] Busca e detalhe de evento funcionam.
-   [ ] Espaços podem ser administrados.
-   [ ] Reserva rápida é independente.
-   [ ] Conflitos de reserva são bloqueados.
-   [ ] Capacidade é considerada.
-   [ ] Checklist funciona.
-   [ ] Complexidade é calculada.
-   [ ] Orçamento previsto funciona.
-   [ ] Auditoria registra operações.
-   [ ] Não há mocks em produção.
-   [ ] Lint aprovado.
-   [ ] TypeScript aprovado, quando aplicável.
-   [ ] Testes disponíveis aprovados.
-   [ ] Build aprovado.
-   [ ] Sem erros relevantes no console.

## 18. Fora do escopo

Não implementar nesta fase:

-   fornecedores completos;
-   credenciamento;
-   participantes completos;
-   financeiro realizado;
-   Atlas;
-   Voice Room;
-   integrações externas.

## 19. Instrução ao Work

Leia `7EVENTOS_SPEC.md` e este documento integralmente.

Faça primeiro um gap analysis do repositório. Depois implemente somente
a Fase 1, seguindo a ordem técnica mais segura e preservando código
funcional existente.

Não antecipe Fases 2, 3 ou 4.

Ao concluir, execute lint, TypeScript, testes e build. Corrija as falhas
e apresente resumo do que foi implementado, migrations criadas, arquivos
relevantes e pendências reais.

Não faça deploy de produção nem publique em branch protegida sem
autorização explícita.
