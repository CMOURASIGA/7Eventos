# Consult Services 7Eventos

## Especificação Funcional e Técnica Oficial

**Versão:** 1.0\
**Data:** 14/08/2026\
**Status:** Base oficial para desenvolvimento\
**Produto:** Consult Services 7Eventos\
**Especialista de IA:** Atlas

------------------------------------------------------------------------

## 1. Objetivo do documento

Este documento é a fonte de verdade funcional para o desenvolvimento do
Consult Services 7Eventos.

Ele consolida a análise do sistema de referência, as decisões de produto
tomadas para a solução da Consult Services e a estratégia de
implementação em fases.

O desenvolvimento deve respeitar esta especificação. Alterações de
escopo devem primeiro ser registradas neste documento antes de serem
implementadas.

------------------------------------------------------------------------

## 2. Visão do produto

O Consult Services 7Eventos é uma plataforma SaaS multiempresa para
planejar, organizar, executar, acompanhar e analisar eventos em um único
ambiente.

A solução deve transformar uma necessidade de evento ou reserva em uma
operação rastreável, associando agenda, espaços, reservas, planejamento,
responsáveis, orçamento, checklists, documentos e histórico a um único
evento.

### 2.1 Assinatura

**Planeje. Organize. Execute. Aprenda.**

### 2.2 Princípios

1.  Simplicidade por intenção.
2.  Um evento como fonte única de verdade operacional.
3.  Gestão do ciclo de vida completo.
4.  Multiempresa desde a fundação.
5.  Governança por perfis e permissões.
6.  Auditoria e rastreabilidade.
7.  Produto utilizável ao final de cada fase.
8.  Evolução incremental sem dependência prematura de integrações
    externas.
9.  IA contextual baseada nos dados reais do próprio evento.
10. Identidade visual alinhada aos sistemas Consult Services.

------------------------------------------------------------------------

## 3. Referência funcional analisada

O produto de referência analisado possui três núcleos principais:
Agenda, Eventos e Espaços.

Foram identificados como recursos relevantes:

-   agenda em calendário e lista;
-   cadastro completo de eventos;
-   reservas de espaços;
-   busca de eventos;
-   cadastro e busca de espaços;
-   verificação de disponibilidade;
-   indicadores;
-   cálculo de complexidade;
-   planejamento;
-   anexos;
-   jornada do participante;
-   visualização geográfica;
-   reservas vinculadas ao evento.

Também foram identificadas oportunidades que devem orientar o 7Eventos:

-   separar reserva rápida de evento completo;
-   implementar validações de dados;
-   padronizar estados vazios e mensagens;
-   estabelecer governança;
-   criar trilha de auditoria;
-   melhorar relatórios;
-   estruturar permissões;
-   preparar o produto para inteligência contextual.

------------------------------------------------------------------------

# 4. Perfis de acesso

## 4.1 Superadministrador Consult Services

Responsável pela administração global da plataforma.

Pode:

-   administrar empresas licenciadas;
-   administrar usuários administrativos;
-   consultar situação das empresas;
-   configurar módulos;
-   acessar informações administrativas globais;
-   suspender ou reativar empresas conforme regras comerciais.

Não deve participar automaticamente dos dados operacionais de cada
empresa.

## 4.2 Administrador da empresa

Responsável pelo ambiente da organização.

Pode:

-   administrar usuários da empresa;
-   configurar cadastros auxiliares;
-   administrar espaços;
-   visualizar todos os eventos da empresa;
-   configurar permissões compatíveis com seu nível;
-   consultar auditoria;
-   acessar relatórios gerenciais.

## 4.3 Gestor de eventos

Responsável pelo planejamento e supervisão.

Pode:

-   criar e editar eventos;
-   definir responsáveis;
-   acompanhar agenda;
-   solicitar e administrar reservas;
-   administrar planejamento e checklist;
-   acompanhar complexidade;
-   aprovar etapas quando autorizado;
-   acessar indicadores operacionais.

## 4.4 Operador / Organizador

Responsável pela execução operacional.

Pode:

-   consultar eventos atribuídos;
-   atualizar atividades e checklists;
-   registrar informações operacionais;
-   consultar agenda e reservas;
-   anexar evidências quando permitido.

## 4.5 Consulta

Perfil somente leitura para informações autorizadas.

------------------------------------------------------------------------

# 5. Arquitetura funcional

O sistema deve ser organizado nos seguintes domínios:

1.  Autenticação e sessão
2.  Empresa e usuários
3.  Dashboard
4.  Agenda
5.  Eventos
6.  Espaços
7.  Reservas
8.  Complexidade
9.  Planejamento e checklists
10. Orçamento
11. Relatórios
12. Auditoria
13. Fornecedores
14. Equipes
15. Participantes e credenciamento
16. Documentos
17. Central de Operação
18. Atlas
19. Voice Room
20. Integrações futuras

Os domínios 13 a 17 pertencem prioritariamente à Fase 2. Atlas e Voice
Room pertencem à Fase 3. Integrações externas pertencem à Fase 4.

------------------------------------------------------------------------

# 6. Entidades principais

## 6.1 Empresa

Campos mínimos:

-   id
-   razão social
-   nome fantasia
-   documento
-   status
-   configurações
-   created_at
-   updated_at

Toda entidade operacional deve possuir vínculo explícito com
`company_id`.

## 6.2 Usuário

Campos mínimos:

-   id
-   company_id
-   nome
-   e-mail
-   perfil
-   status
-   created_at
-   updated_at

## 6.3 Evento

Campos funcionais mínimos:

### Identificação

-   id
-   company_id
-   título
-   descrição
-   temática
-   categoria
-   status
-   responsável
-   demandante
-   contato do demandante

### Agenda

-   data/hora inicial
-   data/hora final
-   possibilidade de múltiplas sessões
-   duração
-   frequência, quando aplicável

### Localização

-   tipo: interno ou externo
-   local
-   espaço
-   formato

### Planejamento

-   escopo
-   segmento
-   classificação
-   público-alvo
-   restrito
-   detalhes do planejamento
-   jornada do participante
-   estratégico
-   previsto em orçamento

### Governança

-   criado por
-   criado em
-   atualizado por
-   atualizado em

## 6.4 Espaço

Campos mínimos:

-   id
-   company_id
-   nome
-   local
-   capacidade
-   status
-   descrição
-   características
-   equipamentos
-   observações

O sistema deve evitar duplicidades indevidas e preservar histórico de
inativação.

## 6.5 Reserva

Campos mínimos:

-   id
-   company_id
-   event_id, opcional em reserva rápida até conversão
-   espaço
-   início
-   fim
-   motivo
-   status
-   solicitante
-   created_at
-   updated_at

## 6.6 Checklist

-   id
-   company_id
-   event_id
-   item
-   categoria
-   responsável
-   prazo
-   status
-   conclusão
-   observação

## 6.7 Orçamento

Estrutura inicial da Fase 1:

-   id
-   company_id
-   event_id
-   valor previsto
-   observações
-   status

A gestão financeira detalhada será evoluída na Fase 2.

## 6.8 Complexidade

Deve registrar variáveis de esforço e impacto e produzir classificação
calculada.

Variáveis de esforço podem considerar:

-   público-alvo;
-   tipo de espaço;
-   faixa de ativações;
-   pacote de serviços;
-   contratação;
-   legislação;
-   jornada do participante.

Variáveis de impacto podem considerar:

-   tipo de público;
-   autoridades;
-   solenidade/cerimonial;
-   evento estratégico.

A fórmula deve ser implementada de maneira configurável e não ficar
espalhada pela interface.

------------------------------------------------------------------------

# 7. Ciclo de vida do evento

O fluxo conceitual é:

**Criação → Planejamento → Reserva/Preparação → Aprovação → Confirmado →
Em execução → Concluído**

Cancelamento deve ser possível conforme permissão.

Mudanças relevantes de status devem gerar histórico.

O sistema não deve apagar a rastreabilidade operacional quando um evento
for concluído ou cancelado.

------------------------------------------------------------------------

# 8. FASE 1 - Fundação e MVP

## 8.1 Objetivo

Entregar um produto operacional que permita à empresa cadastrar
usuários, organizar eventos, controlar agenda e espaços, administrar
reservas, planejar atividades, calcular complexidade, acompanhar
orçamento previsto e consultar indicadores.

A Fase 1 deve ser utilizável independentemente das Fases 2, 3 e 4.

## 8.2 Escopo obrigatório

### 8.2.1 Autenticação

Implementar:

-   login;
-   logout;
-   sessão;
-   recuperação de acesso, se suportada pela arquitetura escolhida;
-   proteção de rotas;
-   vínculo do usuário à empresa;
-   controle de acesso por perfil.

### 8.2.2 Multiempresa

Todas as consultas operacionais devem respeitar `company_id`.

Usuários de uma empresa não podem acessar dados de outra empresa.

A arquitetura deve estar preparada para licenciamento SaaS.

### 8.2.3 Dashboard

Apresentar visão gerencial com indicadores como:

-   total de eventos;
-   próximos eventos;
-   eventos por status;
-   eventos por tipo/categoria;
-   eventos por complexidade;
-   eventos estratégicos;
-   reservas por status;
-   ocupação de espaços quando os dados permitirem;
-   eventos com e sem orçamento previsto.

Filtros de período devem ser consistentes em todos os indicadores.

### 8.2.4 Agenda

Implementar:

-   calendário mensal;
-   visão em lista;
-   navegação entre períodos;
-   filtros;
-   diferenciação visual por status ou categoria;
-   painel de eventos do dia;
-   acesso ao detalhe do evento;
-   respeito ao isolamento por empresa.

### 8.2.5 Eventos

Criar hub de eventos com ações:

-   Novo evento;
-   Reserva rápida;
-   Ver agenda;
-   Buscar eventos.

A busca deve permitir, no mínimo:

-   palavra-chave/título;
-   demandante;
-   período;
-   status;
-   complexidade;
-   local;
-   temática;
-   estratégico.

Resultados devem permitir ações conforme perfil:

-   visualizar;
-   editar;
-   acompanhar planejamento;
-   cancelar/excluir conforme regra e permissão.

### 8.2.6 Cadastro de evento

Organizar o cadastro por etapas ou abas claras.

#### Informações Gerais

-   título;
-   temática;
-   datas;
-   duração;
-   frequência;
-   status;
-   localização;
-   local;
-   espaço;
-   formato;
-   demandante;
-   contato;
-   categoria;
-   responsável;
-   entidade/parceiro quando aplicável;
-   descrição;
-   evento previsto no orçamento.

#### Detalhes e Planejamento

-   escopo;
-   segmento;
-   classificação;
-   público-alvo;
-   restrição;
-   planejamento;
-   checklist;
-   jornada do participante;
-   anexos, caso a infraestrutura de arquivos já esteja prevista na Fase
    1.

#### Reservas

-   reservas vinculadas;
-   status;
-   criação de nova reserva;
-   consulta de disponibilidade.

#### Complexidade

-   esforço;
-   impacto;
-   complexidade calculada;
-   visualização das variáveis consideradas.

### 8.2.7 Reserva rápida

Reserva rápida NÃO deve abrir o cadastro completo de evento.

Fluxo:

1.  selecionar local;
2.  selecionar espaço;
3.  informar data/hora inicial;
4.  informar data/hora final;
5.  informar quantidade mínima de pessoas quando necessário;
6.  verificar disponibilidade;
7.  informar motivo;
8.  confirmar solicitação/reserva.

Posteriormente a reserva poderá ser vinculada ou convertida em evento
completo, sem duplicar dados.

### 8.2.8 Espaços

Implementar:

-   Novo Espaço;
-   Buscar Espaço;
-   Nova Reserva;
-   Buscar Reserva;
-   Verificar Disponibilidade.

Cadastro:

-   nome;
-   local;
-   capacidade;
-   status;
-   características;
-   equipamentos;
-   observações.

Validações devem existir no frontend e na camada de dados.

### 8.2.9 Disponibilidade

A verificação deve considerar:

-   empresa;
-   espaço;
-   intervalo de data/hora;
-   capacidade mínima;
-   reservas conflitantes;
-   status válido da reserva;
-   status ativo do espaço.

Não permitir confirmação de duas reservas incompatíveis para o mesmo
espaço e período.

### 8.2.10 Checklist operacional

Cada evento deve possuir checklist.

Permitir:

-   adicionar item;
-   atribuir responsável;
-   prazo;
-   status;
-   conclusão;
-   observação;
-   acompanhamento do percentual concluído.

### 8.2.11 Orçamento básico

Na Fase 1:

-   marcar evento como previsto em orçamento;
-   informar valor previsto;
-   consultar eventos com/sem orçamento;
-   apresentar indicador correspondente.

Não implementar ainda a contabilidade completa de fornecedores,
pagamentos e realizado. Isso pertence à Fase 2.

### 8.2.12 Relatórios iniciais

Permitir consultas gerenciais por:

-   período;
-   status;
-   categoria;
-   complexidade;
-   espaço;
-   demandante;
-   estratégico;
-   orçamento.

Preparar estrutura para exportação, caso tecnicamente viável na
implementação inicial.

### 8.2.13 Auditoria

Registrar operações relevantes:

-   criação;
-   edição;
-   alteração de status;
-   reserva;
-   cancelamento;
-   conclusão;
-   mudanças administrativas relevantes.

Registro mínimo:

-   usuário;
-   empresa;
-   entidade;
-   ação;
-   data/hora;
-   identificador do registro.

------------------------------------------------------------------------

# 9. Regras de negócio da Fase 1

## RN01 - Isolamento

Nenhum dado operacional pode ser retornado sem considerar a empresa do
usuário.

## RN02 - Conflito de reserva

Um espaço não pode possuir reservas ativas incompatíveis no mesmo
intervalo.

## RN03 - Capacidade

Quando houver número esperado de participantes, a disponibilidade deve
sinalizar incompatibilidade de capacidade.

## RN04 - Espaço inativo

Espaços inativos não podem receber novas reservas.

## RN05 - Validação

Campos obrigatórios e limites de tamanho devem ser validados no frontend
e na camada de persistência.

## RN06 - Estado vazio

Telas de busca não devem informar "nenhum resultado" antes de uma
pesquisa ser executada.

## RN07 - Reserva rápida

Reserva simples deve permanecer um fluxo independente do cadastro
completo de evento.

## RN08 - Complexidade

A classificação deve ser derivada de esforço e impacto conforme regra
centralizada.

## RN09 - Histórico

Alterações relevantes devem ser rastreáveis.

## RN10 - Exclusão

Preferir inativação/cancelamento ou exclusão lógica quando a remoção
física prejudicar auditoria.

## RN11 - Permissões

A interface não deve ser a única proteção. Permissões devem ser
aplicadas também na camada de dados/serviço.

## RN12 - Datas

Data/hora final deve ser posterior à inicial.

------------------------------------------------------------------------

# 10. Telas mínimas da Fase 1

1.  Login
2.  Dashboard
3.  Agenda
4.  Hub de Eventos
5.  Novo Evento
6.  Buscar Eventos
7.  Detalhe do Evento
8.  Editar Evento
9.  Reserva Rápida
10. Hub de Espaços
11. Novo Espaço
12. Buscar Espaços
13. Detalhe do Espaço
14. Nova Reserva
15. Buscar Reservas
16. Verificar Disponibilidade
17. Planejamento/Checklist
18. Complexidade
19. Relatórios
20. Administração de usuários
21. Auditoria
22. Perfil/Sessão

------------------------------------------------------------------------

# 11. Critérios de aceite da Fase 1

A Fase 1 somente poderá ser considerada concluída quando:

-   autenticação estiver funcional;
-   isolamento multiempresa estiver validado;
-   perfis respeitarem permissões;
-   evento puder ser criado, consultado, editado e acompanhado;
-   agenda refletir os eventos;
-   espaços puderem ser administrados;
-   reserva rápida funcionar sem exigir evento completo;
-   conflito de reservas estiver protegido;
-   complexidade for calculada;
-   checklist estiver vinculado ao evento;
-   orçamento previsto puder ser registrado;
-   dashboard usar dados reais da aplicação;
-   histórico/auditoria registrar operações relevantes;
-   não houver dados mockados no ambiente de produção;
-   lint estiver aprovado;
-   TypeScript estiver aprovado, quando aplicável;
-   testes disponíveis estiverem aprovados;
-   build de produção estiver aprovado;
-   erros de console relevantes estiverem resolvidos;
-   responsividade das telas principais estiver validada.

------------------------------------------------------------------------

# 12. FASE 2 - Gestão completa do evento

A Fase 2 expande o MVP para operação detalhada.

Implementar:

## 12.1 Fornecedores

-   cadastro;
-   contatos;
-   categoria;
-   serviços;
-   vínculo ao evento;
-   custos;
-   documentos;
-   status.

## 12.2 Equipes

-   membros;
-   função;
-   responsabilidade;
-   escala;
-   vínculo com atividades;
-   acompanhamento.

## 12.3 Cronograma operacional

-   marcos;
-   tarefas;
-   responsáveis;
-   prazos;
-   dependências;
-   situação;
-   visão temporal.

## 12.4 Documentos

Central de documentos do evento:

-   propostas;
-   contratos;
-   autorizações;
-   plantas;
-   apresentações;
-   evidências;
-   outros anexos.

## 12.5 Participantes

-   cadastro/importação;
-   lista;
-   status;
-   presença;
-   informações necessárias ao evento.

## 12.6 Inscrição e credenciamento

-   inscrições;
-   confirmação;
-   check-in;
-   credenciamento;
-   acompanhamento de presença.

## 12.7 Financeiro detalhado

Evoluir orçamento para:

-   previsto;
-   contratado;
-   realizado;
-   fornecedores;
-   categorias;
-   diferenças;
-   visão consolidada.

## 12.8 Central de Operação

Criar uma visão operacional do evento reunindo:

-   status geral;
-   cronograma;
-   checklists;
-   pendências;
-   equipe;
-   fornecedores;
-   participantes;
-   reservas;
-   documentos;
-   riscos;
-   financeiro.

------------------------------------------------------------------------

# 13. FASE 3 - Atlas, inteligência do 7Eventos

## 13.1 Papel

Atlas será o especialista de IA do 7Eventos.

Ele não deve funcionar como um chatbot genérico. Deve utilizar o
contexto do evento e as permissões do usuário para apoiar decisões e
execução.

## 13.2 Capacidades

Atlas deve poder:

-   resumir situação do evento;
-   identificar pendências;
-   identificar riscos;
-   sugerir próximas ações;
-   analisar cronograma;
-   analisar checklists;
-   analisar orçamento;
-   apontar conflitos;
-   preparar briefing operacional;
-   apoiar encerramento;
-   gerar recomendações com base nos dados existentes;
-   responder perguntas sobre o evento.

## 13.3 Contexto

As respostas do Atlas devem considerar, quando autorizado:

-   evento;
-   planejamento;
-   agenda;
-   reservas;
-   espaços;
-   checklist;
-   cronograma;
-   fornecedores;
-   equipe;
-   participantes;
-   orçamento;
-   documentos;
-   histórico.

## 13.4 Segurança

Atlas deve respeitar:

-   company_id;
-   usuário;
-   perfil;
-   permissões;
-   escopo do evento.

A IA nunca deve ser utilizada para contornar regras de autorização.

## 13.5 Voice Room

Adicionar Voice Room para interação com Atlas.

Objetivos:

-   conversar sobre o evento;
-   consultar situação;
-   registrar pontos relevantes;
-   obter resumo;
-   identificar ações;
-   transformar decisões autorizadas em registros estruturados.

A Voice Room deve preservar rastreabilidade e não alterar dados críticos
sem ação explícita do usuário.

------------------------------------------------------------------------

# 14. FASE 4 - Integrações futuras

A Fase 4 está deliberadamente fora do desenvolvimento inicial.

Pode futuramente contemplar:

-   calendários externos;
-   e-mail;
-   mensageria;
-   plataformas de inscrição;
-   serviços financeiros;
-   mapas;
-   sistemas corporativos;
-   ferramentas de atendimento;
-   APIs de parceiros.

## Regra arquitetural

As Fases 1, 2 e 3 não podem depender obrigatoriamente dessas integrações
para funcionar.

Integrações devem ser implementadas através de adaptadores/serviços
desacoplados.

------------------------------------------------------------------------

# 15. Padrão visual Consult Services

O 7Eventos deve seguir a família visual dos sistemas Consult Services,
especialmente 7Commander e 7Finance.

Diretrizes:

-   Consult Services como marca principal;
-   7Eventos como produto;
-   predominância de azul Consult Services;
-   evitar predominância roxa/índigo;
-   sidebar e navegação coerentes com os demais produtos;
-   cards e indicadores consistentes;
-   estados de loading, erro, sucesso e vazio padronizados;
-   mensagens relevantes preferencialmente em componente visual central
    do sistema, evitando alertas nativos do navegador;
-   responsividade;
-   acessibilidade básica;
-   experiência visual coerente entre módulos.

------------------------------------------------------------------------

# 16. Diretrizes técnicas

1.  Analisar o repositório antes de alterar arquitetura.
2.  Reaproveitar componentes existentes adequados.
3.  Não reescrever código funcional sem justificativa.
4.  Manter separação entre UI, domínio, persistência e serviços.
5.  Centralizar regras de negócio críticas.
6.  Preparar migrations versionadas.
7.  Aplicar autorização na camada de dados.
8.  Evitar segredos no frontend.
9.  Não utilizar dados fictícios em produção.
10. Manter tipos consistentes.
11. Tratar erros de maneira padronizada.
12. Validar entradas.
13. Registrar auditoria.
14. Evitar dependências externas desnecessárias.
15. Não antecipar a Fase 4.

------------------------------------------------------------------------

# 17. Estratégia de execução no ChatGPT Work

Este arquivo deve ser lido antes de qualquer implementação.

A execução deve ocorrer fase por fase.

## Primeiro ciclo

Executar somente a Fase 1.

O agente deve:

1.  ler este documento integralmente;
2.  analisar o repositório atual;
3.  produzir um gap analysis entre código atual e Fase 1;
4.  definir ordem técnica de implementação;
5.  implementar somente a Fase 1;
6.  executar migrations necessárias;
7.  validar permissões e isolamento;
8.  executar lint;
9.  executar TypeScript;
10. executar testes disponíveis;
11. executar build;
12. corrigir falhas encontradas;
13. apresentar resumo final de arquivos, banco, funcionalidades e
    pendências.

Não iniciar a Fase 2 automaticamente.

## Segundo ciclo

Somente após aprovação explícita da Fase 1, implementar a Fase 2.

## Terceiro ciclo

Somente após aprovação explícita da Fase 2, implementar Atlas e Voice
Room.

## Quarto ciclo

Integrações somente após decisão específica de arquitetura e escopo.

------------------------------------------------------------------------

# 18. Prompt curto recomendado para o Work

Leia integralmente `docs/7EVENTOS_SPEC.md`.

Este documento é a fonte de verdade funcional e técnica do Consult
Services 7Eventos.

Analise o estado atual do repositório e confronte-o com a seção
`FASE 1 - Fundação e MVP`.

Antes de alterar código, apresente um gap analysis objetivo e a ordem
técnica de implementação.

Depois implemente exclusivamente a Fase 1, respeitando regras de
negócio, multiempresa, perfis, identidade Consult Services e critérios
de aceite descritos na especificação.

Não implemente antecipadamente funcionalidades exclusivas das Fases 2, 3
ou 4.

Ao concluir, execute todas as validações disponíveis, incluindo lint,
TypeScript, testes e build. Corrija os problemas encontrados e apresente
um resumo final do que foi implementado e das pendências reais.

Não faça deploy em produção nem publique em branch protegida sem
autorização explícita.

------------------------------------------------------------------------

# 19. Definição de pronto

Uma funcionalidade é considerada pronta quando:

-   atende à especificação;
-   respeita permissões;
-   respeita multiempresa;
-   possui validação;
-   possui tratamento de erro;
-   não apresenta erro relevante de console;
-   está integrada aos dados reais;
-   mantém padrão visual;
-   não quebra funcionalidades existentes;
-   passa pelas validações técnicas disponíveis;
-   possui rastreabilidade quando aplicável.

------------------------------------------------------------------------

# 20. Controle de evolução

Qualquer mudança funcional relevante deve seguir:

**Decisão → atualização desta SPEC → implementação → validação**

O código não deve se tornar a única documentação do comportamento do
produto.

------------------------------------------------------------------------

**Fim da especificação 1.0**
