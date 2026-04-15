

## Plano: Alerta de "Processo não encontrado" + Rastreio no Super Admin

### Problema
Ao cadastrar o processo `0805084-52.2026.8.22.0000`, a API Judit retornou `LAWSUIT_NOT_FOUND` (code: 2) em `capa_completa` e `detalhes_completos`. Porém, nenhum aviso é exibido ao usuário no drawer de detalhes, e o super admin não tem visibilidade sobre processos nessa situação.

### Alterações

**1. `src/components/Controladoria/ProcessoOABDetalhes.tsx` — Alerta visual**
- Após o alerta de "Processo Sigiloso" (linha ~500), adicionar um novo Card de alerta quando `capa_completa?.code === 2` ou `detalhes_completos?.code === 'LAWSUIT_NOT_FOUND'`
- Visual: Card com fundo vermelho/laranja, ícone `AlertTriangle`, texto explicando que o processo não foi localizado nas bases judiciais
- Sugestão ao usuário: verificar número CNJ, preencher dados manualmente, ou tentar novamente mais tarde

**2. `src/components/SuperAdmin/SuperAdminProcessosSemAndamentos.tsx` — Expandir rastreio**
- Renomear/expandir para incluir processos com status `LAWSUIT_NOT_FOUND`
- Adicionar coluna/badge indicando o motivo (sem andamentos vs não encontrado)
- Consultar `processos_oab` onde `capa_completa->>'code' = '2'` ou `detalhes_completos->>'message' = 'LAWSUIT_NOT_FOUND'`

**3. Novo componente ou aba no Super Admin: "Processos com Falha"**
- Listar todos os processos de todos os tenants que retornaram `LAWSUIT_NOT_FOUND`
- Exibir: tenant, número CNJ, data de cadastro, request_id, quem adicionou
- Botão para re-tentar busca de detalhes

### Arquivos

| Ação | Arquivo |
|------|---------|
| Editar | `src/components/Controladoria/ProcessoOABDetalhes.tsx` — alerta "não encontrado" |
| Editar | `src/components/SuperAdmin/SuperAdminProcessosSemAndamentos.tsx` — incluir processos NOT_FOUND |
| Possível | Aba/seção dedicada no Super Admin para rastreio de falhas |

### Sem alteração de banco
Não precisa de migration — os dados (`capa_completa.code`, `detalhes_completos.message`) já estão armazenados.

