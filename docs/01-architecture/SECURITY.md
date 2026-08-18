# Segurança

- Validar entrada no frontend e novamente no servidor/camada de persistência.
- Não expor segredos, credenciais ou tokens no cliente.
- Aplicar autenticação e autorização em rotas protegidas.
- Evitar mensagens de erro que exponham detalhes internos.
- Registrar eventos administrativos e operacionais relevantes.
- Preservar isolamento entre empresas.
- Minimizar dados pessoais e coletar somente o necessário à finalidade operacional.
- Uploads futuros devem validar tipo, tamanho, autorização e vínculo ao evento.
- Atlas nunca recebe credenciais de provedores externos.
- Mudanças críticas originadas por IA exigem confirmação explícita.
