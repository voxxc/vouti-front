
# Sincronizar Dados Completos do Response para Campos do Processo

## Problema Identificado

Ao fazer GET manual no `request_id` `0cf225fa-ff0e-4655-992e-ced9267751eb`, voce obteve dados mais completos (partes, valor, etc.) do que o sistema esta exibindo no Resumo. Isso acontece porque:

1. O processo foi importado sem as credenciais do cofre (antes da correcao de hoje)
2. A Edge Function `judit-buscar-detalhes-processo` salva o JSON bruto em `detalhes_completos` mas **nao extrai/atualiza os campos individuais** como:
   - `partes_completas` (parties)
   - `parte_ativa` / `parte_passiva`
   - `valor_causa` (amount)
   - `data_distribuicao` (distribution_date)
   - `status_processual` (situation)
   - `link_tribunal` (related_links)

---

## Solucao Proposta

Modificar a Edge Function `judit-buscar-detalhes-processo` para:

1. **Extrair e atualizar campos individuais** do response da API
2. **Sincronizar partes_completas** com o array `parties`
3. **Atualizar valor_causa** com `amount`
4. **Atualizar data_distribuicao** com `distribution_date`
5. **Atualizar link_tribunal** se disponivel

---

## Alteracoes Tecnicas

### Arquivo: `supabase/functions/judit-buscar-detalhes-processo/index.ts`

Adicionar extracao de campos antes do update (linhas 399-413):

```typescript
// Extrair dados adicionais do response
const parties = responseData?.parties || [];
const amount = responseData?.amount || null;
const distributionDate = responseData?.distribution_date || null;
const situation = responseData?.situation || null;
const phase = responseData?.phase || null;
const relatedLinks = responseData?.related_links || responseData?.link || null;

// Extrair partes ativa/passiva do array parties
let parteAtiva = '';
let partePassiva = '';

const autores = parties
  .filter((p: any) => {
    const tipo = (p.person_type || '').toUpperCase();
    const side = (p.side || '').toLowerCase();
    return side === 'active' || tipo.includes('ATIVO') || tipo.includes('AUTOR');
  })
  .map((p: any) => p.name)
  .filter(Boolean);

const reus = parties
  .filter((p: any) => {
    const tipo = (p.person_type || '').toUpperCase();
    const side = (p.side || '').toLowerCase();
    return side === 'passive' || tipo.includes('PASSIVO') || tipo.includes('REU');
  })
  .map((p: any) => p.name)
  .filter(Boolean);

parteAtiva = autores.join(' e ');
partePassiva = reus.join(' e ');

// Fallback para campo "name" com " X "
if (!parteAtiva && !partePassiva && responseData.name?.includes(' X ')) {
  const partes = responseData.name.split(' X ');
  parteAtiva = partes[0]?.trim() || '';
  partePassiva = partes[1]?.trim() || '';
}

// Update com campos extraidos
await supabase
  .from('processos_oab')
  .update({
    detalhes_completos: responseData,
    detalhes_carregados: true,
    detalhes_request_id: requestId,
    detalhes_request_data: new Date().toISOString(),
    ultima_atualizacao_detalhes: new Date().toISOString(),
    ai_summary: aiSummary,
    ai_summary_data: summaryData,
    // NOVOS CAMPOS
    partes_completas: parties.length > 0 ? parties : null,
    parte_ativa: parteAtiva || null,
    parte_passiva: partePassiva || null,
    valor_causa: amount,
    data_distribuicao: distributionDate,
    status_processual: situation,
    fase_processual: phase,
    link_tribunal: relatedLinks,
    updated_at: new Date().toISOString()
  })
  .eq('numero_cnj', numeroCnj)
  .eq('tenant_id', tenantId);
```

---

## Logica de Condicao (Preservar Dados Manuais)

Para nao sobrescrever dados editados manualmente pelo usuario, os campos so serao atualizados se:
- O valor atual estiver vazio/null
- OU o valor vier da API (indicando dados mais completos)

Implementaremos uma verificacao condicional para cada campo.

---

## Fluxo Pos-Correcao

```text
Usuario clica "Atualizar Andamentos"
              |
              v
Edge Function faz GET /responses?request_id=...
              |
              v
Extrai parties, amount, distribution_date, etc.
              |
              v
Atualiza campos individuais no banco
              |
              v
Interface exibe dados completos no Resumo
```

---

## Teste Pos-Implementacao

1. Clicar em "Atualizar Andamentos" para o processo `0003732-65.2024.8.16.0021`
2. Verificar se as partes, valor da causa e outros dados aparecem no Resumo
3. Confirmar que os andamentos continuam sendo inseridos normalmente

---

## Resultado Esperado

- Dados de partes extraidos e exibidos corretamente
- Valor da causa preenchido automaticamente
- Demais campos sincronizados com a API
- Dados editados manualmente preservados (nao sobrescritos)
