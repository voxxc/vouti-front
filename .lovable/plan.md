

## Plano: Adicionar Tribunais EPROC Estaduais

### Contexto

O cliente solicitou adicionar tribunais que utilizam EPROC para os estados: RS, SC, TO, AC, MG, RJ e SP.

Os tribunais devem seguir o formato de payload: `"EPROC - TJRS - 1° grau"`, `"EPROC - TJSC - 1° grau"`, etc.

---

### Situacao Atual

No arquivo `src/constants/tribunaisCredenciais.ts`, a secao EPROC (linhas 184-200) ja possui:

| Tribunal | Status |
|----------|--------|
| EPROC - TJRS - 1 e 2 grau | Ja existe |
| EPROC - TJSC - 1 e 2 grau | Ja existe |
| EPROC - TRF1 a TRF6 | Ja existe (federais) |

---

### Tribunais a Adicionar

| Estado | Tribunal | Acao |
|--------|----------|------|
| RS | EPROC - TJRS | Ja existe |
| SC | EPROC - TJSC | Ja existe |
| TO | EPROC - TJTO | Adicionar |
| AC | EPROC - TJAC | Adicionar |
| MG | EPROC - TJMG | Adicionar |
| RJ | EPROC - TJRJ | Adicionar |
| SP | EPROC - TJSP | Adicionar |

Total: 10 novas entradas (5 estados x 2 graus)

---

### Modificacoes

#### Arquivo: `src/constants/tribunaisCredenciais.ts`

Adicionar apos a linha 188 (depois de TJSC - 2 grau):

```typescript
// EPROC - Tribunais Estaduais adicionais
{ value: 'EPROC - TJTO - 1º grau', label: 'EPROC - TJTO - 1º grau', category: 'EPROC' },
{ value: 'EPROC - TJTO - 2º grau', label: 'EPROC - TJTO - 2º grau', category: 'EPROC' },
{ value: 'EPROC - TJAC - 1º grau', label: 'EPROC - TJAC - 1º grau', category: 'EPROC' },
{ value: 'EPROC - TJAC - 2º grau', label: 'EPROC - TJAC - 2º grau', category: 'EPROC' },
{ value: 'EPROC - TJMG - 1º grau', label: 'EPROC - TJMG - 1º grau', category: 'EPROC' },
{ value: 'EPROC - TJMG - 2º grau', label: 'EPROC - TJMG - 2º grau', category: 'EPROC' },
{ value: 'EPROC - TJRJ - 1º grau', label: 'EPROC - TJRJ - 1º grau', category: 'EPROC' },
{ value: 'EPROC - TJRJ - 2º grau', label: 'EPROC - TJRJ - 2º grau', category: 'EPROC' },
{ value: 'EPROC - TJSP - 1º grau', label: 'EPROC - TJSP - 1º grau', category: 'EPROC' },
{ value: 'EPROC - TJSP - 2º grau', label: 'EPROC - TJSP - 2º grau', category: 'EPROC' },
```

---

### Integracao com SuperAdmin

O componente `TenantCredenciaisDialog.tsx` ja esta configurado corretamente:

1. Importa a lista de tribunais de `tribunaisCredenciais.ts` (linha 16)
2. Usa `getTribunaisPorCategoria()` para agrupar no Select (linha 55)
3. Envia o `systemName` selecionado para a Edge Function (linhas 92 e 120)

Nenhuma alteracao necessaria no componente - ele ja carrega dinamicamente a lista de tribunais.

---

### Fluxo de Uso no SuperAdmin

```text
1. Abrir TenantCredenciaisDialog
2. Ir para aba "Enviar Pendente" ou "Envio Direto"
3. Selecionar tribunal no campo "Tribunal/Sistema"
   └─> Agora aparecera: EPROC - TJTO - 1º grau, EPROC - TJMG - 1º grau, etc.
4. Preencher demais campos
5. Clicar "Enviar para Judit"
   └─> O system_name enviado sera exatamente o valor selecionado
```

---

### Secao EPROC Final (apos alteracao)

```typescript
// EPROC - Tribunais Estaduais
{ value: 'EPROC - TJRS - 1º grau', ... },
{ value: 'EPROC - TJRS - 2º grau', ... },
{ value: 'EPROC - TJSC - 1º grau', ... },
{ value: 'EPROC - TJSC - 2º grau', ... },
{ value: 'EPROC - TJTO - 1º grau', ... },  // NOVO
{ value: 'EPROC - TJTO - 2º grau', ... },  // NOVO
{ value: 'EPROC - TJAC - 1º grau', ... },  // NOVO
{ value: 'EPROC - TJAC - 2º grau', ... },  // NOVO
{ value: 'EPROC - TJMG - 1º grau', ... },  // NOVO
{ value: 'EPROC - TJMG - 2º grau', ... },  // NOVO
{ value: 'EPROC - TJRJ - 1º grau', ... },  // NOVO
{ value: 'EPROC - TJRJ - 2º grau', ... },  // NOVO
{ value: 'EPROC - TJSP - 1º grau', ... },  // NOVO
{ value: 'EPROC - TJSP - 2º grau', ... },  // NOVO
// EPROC - TRFs (ja existentes)
{ value: 'EPROC - TRF1 - 1º grau', ... },
...
```

---

### Resumo

| Arquivo | Acao |
|---------|------|
| `src/constants/tribunaisCredenciais.ts` | Adicionar 10 novos tribunais EPROC estaduais |

Total de tribunais EPROC apos modificacao: 26 (14 estaduais + 12 TRFs)

O payload enviado para a API Judit sera exatamente o valor do campo `value`, ex: `"EPROC - TJRS - 1º grau"`, garantindo compatibilidade com a documentacao oficial.

