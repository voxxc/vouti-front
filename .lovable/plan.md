
# Plano: Carregar Andamentos Automaticamente na Importação

## Contexto do Problema

Atualmente existem **dois fluxos de importação** de processos:

| Fluxo | O que acontece | Andamentos |
|-------|----------------|------------|
| **Importar por CNJ** (`ImportarProcessoCNJDialog`) | Chama `judit-buscar-processo-cnj` | ✅ Já carrega automaticamente (polling interno) |
| **Importar da busca OAB** (`ImportarProcessoDialog` + `BuscarPorOABTab`) | Insere processo + andamentos do resultado OAB | ⚠️ Andamentos parciais (só os que vieram na busca OAB) |

O problema está no segundo fluxo: quando você importa um processo que veio da busca por OAB, ele só salva os andamentos que vieram nessa busca inicial (geralmente poucos/resumidos). Para ter andamentos completos, o usuário precisa abrir o drawer e clicar em "Carregar Andamentos" - o que gera uma nova consulta paga.

---

## Solução Proposta

Após importar o processo (criar registro no banco), disparar automaticamente em background a busca de detalhes completos + andamentos usando a mesma Edge Function `judit-buscar-detalhes-processo`.

### Fluxo Atualizado

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Usuário clica "Importar Processo"                                   │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Dialog fecha imediatamente                                       │
│ 2. Toast: "Processo importado! Carregando andamentos..."            │
│ 3. Processo é criado no banco (estado: detalhes_carregados = false) │
│ 4. Background: judit-buscar-detalhes-processo é chamado             │
│ 5. Toast final: "Andamentos carregados (X novos)"                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Necessárias

### Arquivo: `src/components/Controladoria/ImportarProcessoDialog.tsx`

Este dialog importa processos vindos da busca por OAB (de `BuscarPorOABTab.tsx`).

**Modificações:**

1. **Remover checkbox "Importar andamentos históricos"** 
   - Não faz mais sentido, pois sempre carregaremos os andamentos completos

2. **Após criar o processo, disparar busca de detalhes em background**
   ```typescript
   // Após criar processo com sucesso
   toast({ 
     title: "✅ Processo importado!",
     description: "Carregando andamentos em segundo plano..."
   });

   // Fechar dialog imediatamente
   onOpenChange(false);

   // Disparar busca de andamentos em background (não aguarda)
   supabase.functions.invoke('judit-buscar-detalhes-processo', {
     body: {
       processoOabId: novoProcesso.id,
       numeroCnj: processo.numero_cnj,
       tenantId,
       userId: user?.id,
       oabId: processo.oab_id // se disponível
     }
   }).then(({ data, error }) => {
     if (error) {
       console.error('[Importar] Erro ao carregar andamentos:', error);
       toast({
         title: "⚠️ Andamentos não carregados",
         description: "Abra o processo para carregar manualmente",
       });
     } else {
       toast({
         title: "📋 Andamentos carregados",
         description: `${data?.andamentosInseridos || 0} andamentos registrados`
       });
     }
   });
   ```

3. **Simplificar UI**: Remover a opção de importar andamentos (sempre importa)

---

## Layout Simplificado do Dialog

**Antes:**
```text
┌──────────────────────────────────────────────────────────────┐
│ Importar Processo para o Sistema                             │
├──────────────────────────────────────────────────────────────┤
│ [0000123-45.2024.8.16.0001]   [TJPR] [Ativo]                │
├──────────────────────────────────────────────────────────────┤
│ ☑ Ativar monitoramento diário                               │
│   Receba notificações automáticas de novos andamentos       │
├──────────────────────────────────────────────────────────────┤
│ ☑ Importar andamentos históricos    ← REMOVER              │
│   5 andamento(s) disponíveis                                │
├──────────────────────────────────────────────────────────────┤
│                          [Cancelar] [Importar Processo]      │
└──────────────────────────────────────────────────────────────┘
```

**Depois:**
```text
┌──────────────────────────────────────────────────────────────┐
│ Importar Processo para o Sistema                             │
├──────────────────────────────────────────────────────────────┤
│ [0000123-45.2024.8.16.0001]   [TJPR] [Ativo]                │
├──────────────────────────────────────────────────────────────┤
│ ☑ Ativar monitoramento diário                               │
│   Receba notificações automáticas de novos andamentos       │
├──────────────────────────────────────────────────────────────┤
│ ℹ️ Os andamentos serão carregados automaticamente           │
├──────────────────────────────────────────────────────────────┤
│                          [Cancelar] [Importar Processo]      │
└──────────────────────────────────────────────────────────────┘
```

---

## Considerações Técnicas

### Custo da API

- A importação por OAB já faz 1 request pago (`/request-document`)
- Carregar andamentos completos faz +1 request pago (`/requests` com `lawsuit_cnj`)
- **Total por processo importado: 2 requests**

Porém, se o processo for **compartilhado** (já existe em outra OAB do mesmo tenant com `detalhes_request_id`), a Edge Function reutiliza o request_id existente e faz apenas GET gratuito.

### Tratamento de Erros

Se a busca de andamentos falhar:
- Processo continua importado normalmente
- Toast informa que andamentos não foram carregados
- Usuário pode carregar manualmente depois abrindo o drawer

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Controladoria/ImportarProcessoDialog.tsx` | Remover checkbox andamentos, adicionar chamada automática à Edge Function |

---

## Resultado Esperado

1. Usuário clica em "Importar" → dialog fecha imediatamente
2. Toast mostra "Processo importado! Carregando andamentos..."
3. Em background, andamentos completos são buscados
4. Toast final informa quantos andamentos foram carregados
5. Ao abrir o drawer, andamentos já estarão disponíveis
