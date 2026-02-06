
# Remover Aba de Request ID e Sincronizar Pendentes

## Resumo
Remover a secao de Request ID e o botao "Sincronizar Pendentes" da interface de OABs, mantendo o salvamento automatico dos Request IDs no Banco de IDs do SuperAdmin (que ja acontece via triggers no banco de dados).

---

## O que sera removido

### 1. Secao "Request ID" dentro de cada aba OAB
Localizada em `src/components/Controladoria/OABManager.tsx` (linhas 459-531):
- Campo que mostra o Request ID atual
- Botao "Consultar" (Download icon)
- Botao "Nova Busca (R$)"
- Botao de editar Request ID (Key icon)
- Botao de carregar detalhes em lote (Search icon)
- Componente `OABRequestHistorico`

### 2. Botao "Sincronizar Pendentes"
Localizado no header das OABs (linhas 292-311):
- Botao com icone ListChecks
- Funcao `handleSyncAndamentosPendentes`
- State `syncPendentesProgress`

---

## O que sera mantido

### Salvamento automatico no SuperAdmin
O Request ID continuara sendo salvo automaticamente no Banco de IDs de cada tenant atraves de:
1. **Trigger no banco**: `trg_oabs_banco_ids` que monitora `oabs_cadastradas.ultimo_request_id`
2. **Quando muda**: Insere registro em `tenant_banco_ids` com tipo `request_busca`
3. **Acesso via SuperAdmin**: Dialog "Banco de IDs" no TenantCard (icone #)

---

## Alteracoes no Codigo

### Arquivo: `src/components/Controladoria/OABManager.tsx`

**Remover imports nao utilizados:**
- `Key` (lucide-react)
- `ListChecks` (lucide-react)
- `OABRequestHistorico` (componente)

**Remover states nao utilizados:**
- `requestIdDialogOpen`
- `selectedOabForRequest` (parcialmente - ainda usado em Nova Busca)
- `inputRequestId`
- `syncPendentesProgress`

**Remover funcoes nao utilizadas:**
- `handleSyncAndamentosPendentes`
- `handleOpenRequestIdDialog`
- `handleSalvarRequestId`
- `handleConsultarRequest`

**Remover da UI:**
1. Botao "Sincronizar Pendentes" (linhas 292-311)
2. Secao Request ID completa dentro do toolbar de cada OAB (linhas 459-531)
3. Dialog de Request ID (linhas 566-601)

---

## Resultado Visual

### Antes
```text
┌─────────────────────────────────────────────────────────────┐
│ OABs [3]                   [Sincronizar Pendentes] [+ OAB]  │
├─────────────────────────────────────────────────────────────┤
│ [92124/PR] [12345/SP] [67890/RJ]                            │
├─────────────────────────────────────────────────────────────┤
│ OAB 92124/PR  Dr. Rodrigo Maran                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔑 Request ID                                           │ │
│ │ 5cf6ecc6-6614-4b02-9251-cd8aaad167f4                    │ │
│ │ [Consultar] [Nova Busca R$] [🔑] [🔍] [📋 Historico]    │ │
│ └─────────────────────────────────────────────────────────┘ │
│ [Importar Processo por CNJ]                                 │
├─────────────────────────────────────────────────────────────┤
│ Lista de processos...                                       │
└─────────────────────────────────────────────────────────────┘
```

### Depois
```text
┌─────────────────────────────────────────────────────────────┐
│ OABs [3]                                     [+ Cadastrar]  │
├─────────────────────────────────────────────────────────────┤
│ [92124/PR] [12345/SP] [67890/RJ]                            │
├─────────────────────────────────────────────────────────────┤
│ OAB 92124/PR  Dr. Rodrigo Maran      Ultima sync: 06/02/26  │
│ [Importar Processo por CNJ]                                 │
├─────────────────────────────────────────────────────────────┤
│ Lista de processos...                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Verificacao no SuperAdmin

Os Request IDs continuam visiveis em:
```text
SuperAdmin > Clientes > [Cliente] > # (Banco de IDs) > Aba "Requests"
```

O trigger do banco garante que toda vez que `ultimo_request_id` for atualizado em `oabs_cadastradas`, um registro sera criado automaticamente em `tenant_banco_ids` com:
- tipo: `request_busca`
- external_id: o UUID do request
- descricao: `Busca OAB {numero}/{uf}`
- metadata: `{ oab_numero, oab_uf }`

---

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Controladoria/OABManager.tsx` | Remover secao Request ID, botao Sincronizar Pendentes, dialog e funcoes relacionadas |

**Opcional (limpeza):**
| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useOABs.ts` | Remover exports `consultarRequest` e `salvarRequestId` se nao forem usados em outro lugar |

---

## Funcionalidades Preservadas

1. **Cadastro de OAB** - continua funcionando normalmente
2. **Nova Busca (R$)** - sera movido para algum lugar? (confirmar com usuario)
3. **Importar por CNJ** - continua funcionando normalmente
4. **Monitoramento** - continua funcionando via toggle em cada processo
5. **Banco de IDs no SuperAdmin** - continua recebendo Request IDs automaticamente

---

## Duvida para Confirmar

O botao "Nova Busca (R$)" que faz uma busca paga deve ser:
1. **Removido completamente** - usuario nao tera como fazer nova busca
2. **Mantido no toolbar** - apenas a secao de Request ID e removida, mas o botao de nova busca fica
3. **Movido para outro lugar** - ex: menu de contexto da OAB

Por favor, confirme como deseja proceder com o botao "Nova Busca".
