

## Corrigir automacao de prazos: falsos positivos e duplicatas

### Problemas identificados

**1. Falso positivo de audiencia**
O andamento "CONFIRMADA A INTIMACAO ELETRONICA Referente ao evento (seq. 6) AUDIENCIA DE CONCILIACAO DESIGNADA (03/02/2026)" foi interpretado como uma nova audiencia. Na realidade, e apenas uma confirmacao de leitura de intimacao que referencia uma audiencia ja existente. A data 03/02/2026 e a data do despacho/evento processual, nao a data da audiencia.

**2. Duplicatas**
O webhook processou os mesmos andamentos 3 vezes, criando 6 deadlines (3 pares identicos), pois nao verifica se ja existe um deadline para o mesmo processo com a mesma data e tipo.

### Impacto para o advogado

- Um prazo agendado para 03/02/2026 (data passada) gera confusao e ruido na agenda
- 3 duplicatas de cada prazo poluem a visualizacao
- Perda de confianca no sistema automatico, levando o advogado a ignorar alertas legitimos

---

### Solucao

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/judit-webhook-oab/index.ts` | Filtrar falsos positivos + prevenir duplicatas |

### Mudanca 1: Filtrar confirmacoes de intimacao

Na funcao `detectarAudiencia` (linha 67), adicionar verificacao para descartar textos que sao apenas confirmacoes de intimacao e nao audiencias novas:

```text
// No inicio da funcao detectarAudiencia, apos verificar se contem "audiencia":
// Descartar confirmacoes de intimacao que apenas referenciam audiencias
if (/confirmad[oa]\s+(a\s+)?intima[çc][ãa]o/i.test(descricao) || 
    /referente ao evento/i.test(descricao)) {
  return null;
}
```

Logica: se o texto contem "CONFIRMADA A INTIMACAO" ou "Referente ao evento", nao e uma audiencia nova -- e uma notificacao sobre um evento ja registrado.

### Mudanca 2: Prevenir duplicatas de deadlines

Antes de inserir cada deadline (linhas 424 e 484), verificar se ja existe um prazo com o mesmo `processo_oab_id`, mesma `date` e titulo similar:

```text
// Verificar duplicata antes de inserir
const { data: existingDeadline } = await supabase
  .from('deadlines')
  .select('id')
  .eq('processo_oab_id', processo.id)
  .eq('date', audiencia.dataHora.toISOString().split('T')[0])
  .ilike('title', `%${audiencia.label}%`)
  .maybeSingle();

if (existingDeadline) {
  console.log('[Judit Webhook OAB] Deadline duplicado ignorado');
  continue;
}
```

### Mudanca 3: Limpar dados incorretos

Executar SQL para remover os 4 deadlines errados (data 03/02/2026) e os duplicatas:

- Remover os 3 deadlines com data 2026-02-03 para o processo em questao (falsos positivos)
- Remover 2 dos 3 deadlines duplicados com data 2026-05-20 (manter apenas 1)
- Remover os logs correspondentes da tabela prazos_automaticos_log

---

### Secao tecnica

A funcao `detectarAudiencia` na edge function usa o Padrao 3 (regex generico `(\d{2})\/(\d{2})\/(\d{4})`) como fallback. Quando o texto "CONFIRMADA A INTIMACAO...AUDIENCIA DE CONCILIACAO DESIGNADA (03/02/2026)" e processado:

1. O regex de tipo encontra "audiencia de conciliacao" -- match positivo (falso positivo)
2. Padrao 1 (extenso) nao bate -- nao tem "Agendada para: X de mes de YYYY"
3. Padrao 2 (sessao virtual) nao bate
4. Padrao 3 (generico DD/MM/YYYY) captura 03/02/2026 -- a data do evento/despacho, nao da audiencia

A solucao e impedir que confirmacoes de intimacao sejam classificadas como audiencias, alem de prevenir duplicatas na insercao.
