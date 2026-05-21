# Remover tribunal Global e upload de documento

## Correção
1. `src/constants/tribunaisCredenciais.ts` — remover entrada `{ value: '*', label: 'Todos os tribunais (global)', category: 'Global' }` (e comentário).
2. `src/components/Support/SubscriptionDrawer.tsx` — remover:
   - estado `documento` / `setDocumento`
   - bloco do campo "Documento (PDF/PFX)" no formulário de nova credencial
   - referências a `documento` no payload de criação e no reset
   - botão de download `cred.documento_url` na listagem (campo deixa de ser preenchido)

## Arquivos afetados
- src/constants/tribunaisCredenciais.ts
- src/components/Support/SubscriptionDrawer.tsx

## Impacto
- UX: dropdown de tribunal não mostra mais "Todos os tribunais (global)". Formulário de nova credencial fica mais curto, sem o input de arquivo. Drawer mais limpo.
- Dados: nenhuma migration. Coluna `documento_url` permanece no banco mas deixa de receber novos uploads pelo drawer (registros antigos continuam acessíveis via outras telas, se houver).
- Riscos: se algum fluxo dependia de credencial global (`tribunal = '*'`), novas credenciais não poderão ser criadas assim pelo drawer — usuário confirmou que removeu intencionalmente.
- Afetados: clientes finais que abrem o drawer "Minha Assinatura" → aba Credenciais.

## Validação
- Abrir drawer → aba Credenciais → "Nova credencial": dropdown sem opção Global, sem campo Documento.
- Criar credencial e confirmar que salva normalmente sem documento.
