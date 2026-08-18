# Estados de UX

Toda feature assíncrona deve tratar:
- Loading: skeleton ou indicador coerente.
- Empty: mensagem contextual e ação possível.
- Error: mensagem compreensível e opção de recuperação quando aplicável.
- Success: confirmação não intrusiva e atualização do estado.
- Permission denied: sem exposição de dados.
- Conflict: explicar conflito sem perder dados preenchidos quando possível.

Busca não deve exibir "nenhum resultado" antes da primeira pesquisa.
