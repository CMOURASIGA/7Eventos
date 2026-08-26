# 7Eventos - Fase 3 - Atlas e Voice Room

**Versão:** 1.0\
**Pré-requisito:** Fases 1 e 2 aprovadas.

## 1. Visão

Atlas é o especialista de IA do 7Eventos.

Seu papel é compreender o contexto operacional de cada evento e ajudar
gestores e equipes a planejar, decidir, executar e encerrar eventos.

Atlas não é um chatbot genérico.

## 2. Princípios

1.  Responder com base em dados autorizados.
2.  Respeitar `company_id`.
3.  Respeitar usuário e perfil.
4.  Explicar de onde vem uma conclusão quando necessário.
5.  Não inventar dados ausentes.
6.  Distinguir fato, risco e recomendação.
7.  Não alterar dados críticos sem confirmação explícita.
8.  Registrar ações estruturadas originadas pela IA.
9.  Minimizar contexto enviado ao modelo.
10. Proteger informações entre empresas.

## 3. Fontes de contexto

Atlas poderá consultar, conforme permissão:

-   evento;
-   sessões;
-   espaço;
-   reservas;
-   planejamento;
-   checklist;
-   complexidade;
-   orçamento;
-   financeiro;
-   fornecedores;
-   equipe;
-   cronograma;
-   participantes;
-   credenciamento;
-   documentos;
-   auditoria;
-   histórico.

## 4. Assistente contextual

Disponibilizar Atlas dentro do contexto do evento.

Perguntas esperadas:

-   Qual a situação deste evento?
-   O que está pendente?
-   O que está atrasado?
-   Quais são os principais riscos?
-   Temos conflito de agenda?
-   Como está o orçamento?
-   O que precisa acontecer hoje?
-   O evento está pronto para execução?
-   O que ficou pendente após o evento?

## 5. Resumo executivo

Gerar resumo contendo:

-   situação;
-   próximos marcos;
-   pendências;
-   riscos;
-   orçamento;
-   reservas;
-   equipe;
-   fornecedores;
-   participantes;
-   recomendações.

Não incluir seções sem dados como se fossem fatos.

## 6. Motor de riscos

Atlas deve identificar sinais como:

-   tarefa atrasada;
-   checklist crítico pendente;
-   reserva não confirmada;
-   capacidade incompatível;
-   orçamento acima do previsto;
-   fornecedor sem confirmação;
-   documento obrigatório ausente;
-   atividade sem responsável;
-   prazo muito próximo;
-   conflito de agenda.

Cada risco deve ter:

-   descrição;
-   severidade;
-   evidência;
-   impacto;
-   recomendação.

## 7. Próximas ações

Atlas pode sugerir ações priorizadas.

Exemplo de estrutura:

-   ação;
-   prioridade;
-   justificativa;
-   prazo sugerido;
-   responsável sugerido, quando houver base.

Sugestão não deve virar tarefa automaticamente sem confirmação.

## 8. Análise financeira

Atlas poderá:

-   explicar variações;
-   identificar categorias acima do previsto;
-   comparar previsto x contratado x realizado;
-   apontar concentração de custo;
-   calcular indicadores disponíveis;
-   sugerir pontos de atenção.

Não oferecer aconselhamento financeiro fora do contexto operacional do
evento.

## 9. Preparação operacional

Criar função de "Preparar briefing".

O briefing deve consolidar:

-   objetivo;
-   agenda;
-   espaço;
-   equipe;
-   fornecedores;
-   cronograma;
-   checklist;
-   participantes;
-   riscos;
-   orçamento;
-   contatos essenciais.

## 10. Encerramento

Atlas deve apoiar retrospectiva:

-   o que foi concluído;
-   pendências finais;
-   desvios de orçamento;
-   ocorrências;
-   aprendizados registrados;
-   recomendações para eventos futuros.

## 11. Voice Room

### Objetivo

Permitir conversa por voz com Atlas no contexto do evento.

### Capacidades

-   perguntar situação;
-   obter resumo;
-   discutir riscos;
-   registrar decisão;
-   criar proposta de ação;
-   gerar resumo da conversa.

### Segurança

Uma conversa pode produzir uma ação sugerida, mas mudanças críticas
devem exigir confirmação explícita.

Exemplo:

Atlas identifica necessidade de criar uma tarefa.

O sistema apresenta:

`Criar tarefa "Confirmar fornecedor de audiovisual" para João até 18/08?`

Somente após confirmação a alteração é persistida.

## 12. Arquitetura de IA

Separar:

-   coleta de contexto;
-   autorização;
-   montagem do contexto;
-   chamada ao modelo;
-   validação da resposta;
-   ações/funções;
-   auditoria;
-   interface.

Não colocar regras críticas apenas no prompt.

## 13. Controle de consumo

Para reduzir custo e tokens:

-   enviar apenas contexto necessário;
-   resumir histórico longo;
-   usar consultas estruturadas;
-   evitar enviar banco inteiro;
-   armazenar resumos úteis;
-   limitar documentos ao necessário;
-   controlar tamanho de conversas;
-   medir tokens por chamada quando a API disponibilizar.

## 14. Auditoria da IA

Registrar, quando aplicável:

-   usuário;
-   evento;
-   tipo de interação;
-   ação proposta;
-   ação confirmada;
-   data/hora;
-   modelo/configuração relevante.

Evitar persistir conteúdo sensível desnecessário.

## 15. Critérios de aceite

-   [ ] Atlas conhece o evento atual.
-   [ ] Não acessa outra empresa.
-   [ ] Respeita perfil.
-   [ ] Resume evento.
-   [ ] Identifica pendências.
-   [ ] Identifica riscos baseados em evidências.
-   [ ] Analisa financeiro operacional.
-   [ ] Sugere próximas ações.
-   [ ] Gera briefing.
-   [ ] Apoia encerramento.
-   [ ] Voice Room funciona.
-   [ ] Alterações críticas exigem confirmação.
-   [ ] Interações relevantes são auditáveis.
-   [ ] Uso de contexto é otimizado.
-   [ ] Build e testes aprovados.

## 16. Instrução ao Work

Somente iniciar após aprovação das Fases 1 e 2.

Leia toda a documentação do produto e analise a arquitetura existente
antes de adicionar IA.

Implemente Atlas como uma camada desacoplada, contextual e autorizada.
Não transforme o frontend em responsável por segurança ou regras de
autorização.

Implemente Voice Room depois que o assistente textual e as funções
estruturadas estiverem estáveis.

Não implementar integrações da Fase 4.
