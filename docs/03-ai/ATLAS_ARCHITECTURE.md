# Atlas - Arquitetura

Atlas é o especialista de IA do 7Eventos, não um chatbot genérico.

## Pipeline
`User -> Authorization -> Event Context -> Context Builder -> Model -> Response Validation -> Optional Tool -> Domain Validation -> Confirmation -> Persist -> Audit`

## Regras
- Respeitar `company_id`, usuário, perfil e escopo do evento.
- Não inventar dados ausentes.
- Distinguir fato, risco e recomendação.
- Regras críticas não ficam somente no prompt.
- Ações críticas exigem confirmação explícita.
- Voice Room somente após assistente textual e funções estruturadas estarem estáveis.
