# 7Eventos - Fase 2 - Gestão Completa do Evento

**Versão:** 1.0\
**Pré-requisito:** Fase 1 aprovada e estável.

## 1. Objetivo

Expandir o 7Eventos de uma plataforma de agenda, espaços e planejamento
para uma central completa de operação do evento.

A Fase 2 deve reutilizar as entidades da Fase 1 e evitar duplicação de
conceitos.

## 2. Fornecedores

Cadastro:

-   razão/nome;
-   documento;
-   categoria;
-   contatos;
-   serviços;
-   status;
-   observações;
-   documentos.

Vínculo ao evento:

-   serviço;
-   responsável interno;
-   valor previsto;
-   valor contratado;
-   situação;
-   datas;
-   documentos.

## 3. Equipe

Permitir:

-   adicionar membros;
-   definir função;
-   definir responsabilidade;
-   associar atividades;
-   definir escala/horário;
-   registrar status.

O usuário deve conseguir visualizar quem responde por cada frente do
evento.

## 4. Cronograma operacional

Entidade de atividade:

-   evento;
-   título;
-   descrição;
-   início;
-   fim;
-   responsável;
-   dependência;
-   prioridade;
-   status;
-   observação.

Visualizações:

-   lista;
-   linha do tempo, quando tecnicamente adequada;
-   atrasadas;
-   próximas;
-   concluídas.

## 5. Documentos

Central documental por evento.

Categorias:

-   proposta;
-   contrato;
-   autorização;
-   planta;
-   apresentação;
-   briefing;
-   evidência;
-   fornecedor;
-   outros.

Requisitos:

-   upload;
-   metadados;
-   usuário responsável;
-   data;
-   vínculo com evento;
-   controle de acesso;
-   exclusão lógica quando necessário.

## 6. Participantes

Cadastro/importação:

-   nome;
-   e-mail;
-   telefone quando necessário;
-   organização;
-   categoria;
-   status;
-   observações.

Evitar coleta de dados sem finalidade operacional.

## 7. Inscrição

Permitir:

-   registrar inscrição;
-   confirmar;
-   cancelar;
-   consultar situação;
-   associar lote/categoria quando necessário.

## 8. Credenciamento

Permitir:

-   localizar participante;
-   registrar check-in;
-   registrar horário;
-   consultar presentes;
-   consultar ausentes;
-   indicadores em tempo real.

## 9. Financeiro detalhado

Evoluir o orçamento da Fase 1.

### Estrutura

-   orçamento previsto;
-   itens;
-   categorias;
-   fornecedores;
-   valor cotado;
-   valor contratado;
-   valor realizado;
-   diferença;
-   status.

### Indicadores

-   orçamento total;
-   comprometido;
-   realizado;
-   saldo;
-   variação previsto x realizado;
-   custo por categoria;
-   custo por participante quando possível.

## 10. Central de Operação

Criar uma tela central para o evento.

Blocos:

-   status geral;
-   data/hora;
-   local;
-   complexidade;
-   cronograma;
-   checklist;
-   equipe;
-   fornecedores;
-   reservas;
-   participantes;
-   credenciamento;
-   documentos;
-   financeiro;
-   pendências;
-   riscos registrados;
-   histórico.

Essa tela será posteriormente uma das principais fontes de contexto do
Atlas.

## 11. Notificações internas

Preparar notificações para:

-   prazo próximo;
-   tarefa atrasada;
-   reserva alterada;
-   documento pendente;
-   orçamento excedido;
-   atividade bloqueada;
-   mudança relevante de status.

Não depender de WhatsApp/e-mail nesta fase.

## 12. Relatórios avançados

Adicionar:

-   previsto x realizado;
-   fornecedores;
-   presença;
-   ocupação;
-   cumprimento do cronograma;
-   conclusão de checklist;
-   performance por período;
-   histórico de eventos.

## 13. Critérios de aceite

-   [ ] Fornecedores vinculáveis a eventos.
-   [ ] Equipe operacional configurável.
-   [ ] Cronograma funcional.
-   [ ] Documentos centralizados.
-   [ ] Participantes administráveis.
-   [ ] Inscrição e credenciamento funcionais.
-   [ ] Financeiro previsto x realizado.
-   [ ] Central de Operação consolidada.
-   [ ] Notificações internas.
-   [ ] Auditoria mantida.
-   [ ] Multiempresa preservado.
-   [ ] Permissões preservadas.
-   [ ] Build e validações aprovados.

## 14. Fora do escopo

Não implementar ainda:

-   Atlas;
-   Voice Room;
-   integrações externas.

## 15. Instrução ao Work

Somente iniciar após aprovação explícita da Fase 1.

Leia `7EVENTOS_SPEC.md`, `FASE_01_MVP.md` e este documento. Analise a
implementação existente e reutilize a fundação já criada.

Implemente exclusivamente a Fase 2. Não inicie Atlas, Voice Room ou
integrações externas.

Valide lint, TypeScript, testes e build antes de concluir.
