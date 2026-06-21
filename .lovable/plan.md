# Causa raiz

A tabela `public.processos` está bloqueando o número do processo de forma global com `UNIQUE (numero_processo)`. Isso impede que o tenant **demorais** cadastre `0123417-95.2025.8.16.0000` porque ele já existe em outro tenant.

Isso está errado para o modelo multi-tenant: o mesmo CNJ pode existir em vários escritórios/tenants, cada um com sua própria cópia, lista, dados internos, etiquetas, comentários, monitoramento e andamentos.

# Correção

1. **Banco de dados**
   - Remover a constraint global `processos_numero_processo_key`.
   - Criar unicidade por tenant: `(tenant_id, numero_processo)`.
   - Resultado: o mesmo número pode existir em tenants diferentes, mas não duplica dentro do mesmo tenant.

2. **Importação pela busca OAB**
   - Ajustar o pré-check de duplicidade para procurar apenas dentro do `tenant_id` atual.
   - Se o processo existir em outro tenant, ignorar esse registro e criar um novo no tenant atual.
   - Se já existir no mesmo tenant, aí sim reaproveitar/atualizar o registro daquele tenant.

3. **Importação por CNJ/manual**
   - Aplicar a mesma regra: duplicidade só vale dentro do tenant atual.
   - Remover lógica que tenta reaproveitar/vincular um processo encontrado fora do tenant atual.

# Arquivos afetados

- `src/components/Controladoria/ImportarProcessoDialog.tsx`
- `src/components/Controladoria/ImportarProcessoCNJDialog.tsx`
- Migration Supabase para trocar a UNIQUE global por índice único composto `(tenant_id, numero_processo)`.

# Impacto

- **Usuário final:** ao importar `0123417-95.2025.8.16.0000` no tenant demorais, o sistema vai cadastrar uma cópia nova para o demorais e colocar na lista dele. Não vai apenas dizer que já está cadastrado em outro tenant.
- **Dados:** registros existentes não serão apagados nem movidos. A mudança é estrutural: a unicidade deixa de ser global e passa a ser por tenant. RLS continua separando os dados por tenant.
- **Riscos colaterais:** qualquer código que assumia `numero_processo` globalmente único precisa sempre usar `tenant_id` junto. Nesta correção, os fluxos de importação serão ajustados para isso.
- **Quem é afetado:** todos os tenants. Cada escritório passa a poder ter sua própria versão do mesmo processo, sem interferir no outro.

# Validação

1. Confirmar que o banco aceita dois registros com o mesmo `numero_processo` em tenants diferentes.
2. Importar `0123417-95.2025.8.16.0000` no tenant demorais.
3. Confirmar que aparece na lista do tenant demorais.
4. Confirmar que o registro do outro tenant continua separado.
5. Reimportar o mesmo CNJ no próprio demorais e confirmar que não cria duplicado dentro do mesmo tenant.