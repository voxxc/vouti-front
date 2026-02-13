

## Corrigir Bugs de Area, Assunto e Separacao de Partes nos Processos CNPJ

### Bugs Identificados

**1. Area mostrando `[object Object]`**
O campo `classifications` da Judit e um array de objetos `[{code, name}]`, nao de strings. O codigo atual faz `.join(", ")` que gera `[object Object]`. Alem disso, existe um campo `area` direto na resposta (ex: `"area": "DIREITO CIVIL"`) que nao esta sendo usado.

**2. Assunto mostrando `[object Object]`**
Mesmo problema: `subjects` e um array de objetos `[{code, name}]`, nao strings.

**3. Partes nao separando advogados**
No `ProcessoCNPJDetalhes.tsx`, o filtro usa `person_type === 'ATIVO'` e `person_type === 'PASSIVO'`, mas a Judit retorna `person_type: "Autor"` e `person_type: "Réu"`. Alem disso, o campo `side` ("Active"/"Passive") nao esta sendo considerado na classificacao do drawer de detalhes. Os advogados (quando existem no array `lawyers` de cada parte) ja estao sendo renderizados, mas a filtragem principal esta incorreta.

**4. Andamentos**
Para responder a pergunta: **nao**, a sincronizacao via tracking nao traz andamentos. O array `steps` vem vazio. Apenas o `last_step` (ultimo andamento) e retornado e ja esta sendo salvo. Isso e esperado pois o Push-Docs monitora novas distribuicoes, nao historico completo.

---

### Correcoes

#### Arquivo 1: `supabase/functions/judit-sync-cnpj-tracking/index.ts`

Corrigir o parse de `classifications` e `subjects` para extrair o `.name` de cada objeto:

```text
// ANTES (bugado):
area_direito: Array.isArray(responseData.classifications)
  ? responseData.classifications.join(", ")
  : null,
assunto: Array.isArray(responseData.subjects)
  ? responseData.subjects.join(", ")
  : null,

// DEPOIS (corrigido):
area_direito: responseData.area
  || (Array.isArray(responseData.classifications)
    ? responseData.classifications.map(c => c.name || c).filter(Boolean).join(", ")
    : null),
assunto: Array.isArray(responseData.subjects)
  ? responseData.subjects.map(s => s.name || s).filter(Boolean).join(", ")
  : null,
```

#### Arquivo 2: `src/components/Controladoria/ProcessoCNPJDetalhes.tsx`

Corrigir a logica de classificacao das partes para usar `side` (Active/Passive) e os valores reais de `person_type` (Autor, Reu, etc.):

```text
// ANTES (bugado):
if (parte.person_type === 'ATIVO' || parte.role?.includes('AUTOR'))
if (parte.person_type === 'PASSIVO' || parte.role?.includes('REU'))

// DEPOIS (corrigido):
// Usar side + person_type com multiplos formatos
const side = (parte.side || '').toLowerCase();
const tipo = (parte.person_type || '').toLowerCase();

if (side === 'active' || tipo.includes('autor') || tipo.includes('ativo') || tipo.includes('requerente'))
  → partesAtivas (excluindo advogados)

if (side === 'passive' || tipo.includes('réu') || tipo.includes('reu') || tipo.includes('passivo') || tipo.includes('requerido'))
  → partesPassivas (excluindo advogados)

// Advogados separados em sua propria secao
```

Tambem melhorar o `renderParteCard` para mostrar:
- Tipo/papel da parte (ex: "Autor", "Reu")
- Documentos (CPF/CNPJ) quando disponiveis via `main_document`
- OAB dos advogados extraida do array `documents`

#### Arquivo 3: Corrigir dados existentes no banco

Apos deploy da edge function corrigida, rodar o botao "Sincronizar" novamente para re-processar os dados e corrigir os campos `area_direito` e `assunto` que estao salvos como `[object Object]`.

---

### Arquivos afetados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/judit-sync-cnpj-tracking/index.ts` | Fix parse de classifications e subjects |
| `src/components/Controladoria/ProcessoCNPJDetalhes.tsx` | Fix classificacao de partes com side/person_type, separar advogados |

### Sobre Andamentos

A sincronizacao via tracking (Push-Docs) **nao traz andamentos** - o array `steps` vem vazio. Apenas o `last_step` e retornado. Isso e normal pois o monitoramento Push-Docs detecta **novas distribuicoes**, nao acompanha o historico de movimentacoes. Para carregar andamentos completos, seria necessaria uma chamada separada (paga) via `/requests`.
