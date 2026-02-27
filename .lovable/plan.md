

## Corrigir Push-Docs: Drawer + Botao + Payload Judit

### Problemas identificados

1. **Drawer (`ControladoriaContent.tsx` linha 5, 152)** ainda importa e renderiza `CNPJManager` em vez de `PushDocsManager`
2. **Botao "Cadastrar CPF/CNPJ/OAB"** no `PushDocsManager.tsx` mostra tipo fixo no botao -- precisa ser **"Adicionar Termo"** e dentro do dialog o usuario escolhe o tipo (CPF, CNPJ ou OAB)
3. **Payload da edge function** `judit-push-docs-cadastrar` envia campo `webhook` que nao faz parte da API oficial de tracking de documentos da Judit. Segundo a documentacao oficial (`POST https://tracking.prod.judit.io/tracking`), o payload correto e:

```json
{
  "recurrence": 1,
  "search": {
    "search_type": "cpf",
    "search_key": "999.999.999-99"
  }
}
```

Nao ha campo `webhook` no payload de criacao de tracking. O webhook e configurado separadamente na conta Judit.

---

### Mudancas

**1. `src/components/Controladoria/ControladoriaContent.tsx`**
- Trocar import de `CNPJManager` por `PushDocsManager`
- Na aba `push-doc`, renderizar `<PushDocsManager />` em vez de `<CNPJManager />`

**2. `src/components/Controladoria/PushDocsManager.tsx`**
- Botao principal muda de "Cadastrar {tipo}" para **"Adicionar Termo"**
- Dentro do dialog de cadastro, adicionar um seletor de tipo (CPF / CNPJ / OAB) como radio group ou select, com valor padrao da aba ativa
- Remover a dependencia do `activeTab` para definir o tipo -- o tipo e escolhido dentro do dialog
- Manter placeholder e mascara dinamicos conforme o tipo selecionado

**3. `supabase/functions/judit-push-docs-cadastrar/index.ts`**
- Remover o campo `webhook` do payload enviado a API Judit (linhas ~131-133)
- Payload final conforme documentacao oficial:
```json
{
  "recurrence": 1,
  "search": {
    "search_type": "cpf|cnpj|oab",
    "search_key": "DOCUMENTO_LIMPO"
  }
}
```
- Ajustar extracao do `tracking_id` da resposta: a Judit retorna `tracking_id` (nao `id`), entao priorizar `juditData.tracking_id`
- Manter validacao de OAB (formato NUMERO+UF)
- Para CPF e CNPJ, enviar search_key com pontuacao (a Judit aceita formatado conforme exemplos da doc: `999.999.999-99`, `00.000.000/0001-00`)

