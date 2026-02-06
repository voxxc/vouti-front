

# Refinamento do Resumo do Processo

## Problemas Identificados

1. **Botao Editar mal posicionado** - Atualmente esta no topo do conteudo com `flex justify-end` ocupando espaco desnecessario
2. **Informacoes nao estao alinhadas no topo** - O botao Editar empurra o conteudo para baixo
3. **Botao Excluir precisa de dupla confirmacao** - Atualmente tem apenas uma confirmacao

---

## Mudancas Propostas

### 1. Mover Botao Editar para Junto do Excluir

**Antes:**
```
[                                    ] [Editar]
Descricao: ...
...
...
Alterar Status: [dropdown]
[Excluir]
```

**Depois:**
```
Descricao: ...
...
...
Alterar Status: [dropdown]
                        [Editar]  [Excluir]
```

Os botoes Editar e Excluir ficarao lado a lado, no final da secao, ambos discretos.

### 2. Alinhar Informacoes no Topo

Remover o container do botao Editar que esta no topo (`<div className="flex justify-end">`) para que a Descricao seja o primeiro elemento visivel.

### 3. Dupla Confirmacao para Excluir

Adicionar uma segunda etapa de confirmacao exigindo que o usuario digite o nome do processo para confirmar a exclusao.

**Fluxo:**
```
Usuario clica em "Excluir"
        |
        v
AlertDialog aparece:
  "Para confirmar, digite: [NOME DO PROCESSO]"
  [input text]________________
  
  [Cancelar]  [Excluir] (desabilitado ate digitar correto)
```

---

## Implementacao Tecnica

### Arquivo: `src/components/Project/ProjectProtocoloDrawer.tsx`

**1. Adicionar estado para confirmacao de texto (linha ~115)**

```typescript
const [deleteConfirmText, setDeleteConfirmText] = useState('');
```

**2. Remover o container do botao Editar (linhas 538-544)**

Excluir:
```tsx
{/* Botão Editar */}
<div className="flex justify-end">
  <Button variant="outline" size="sm" onClick={startEditing}>
    <Pencil className="h-4 w-4 mr-2" />
    Editar
  </Button>
</div>
```

**3. Modificar a secao de acoes (linhas 607-638)**

De:
```tsx
{/* Ações */}
<div className="pt-4 border-t space-y-3">
  <div>
    <Label>Alterar Status</Label>
    <Select...>
  </div>
  <Button variant="ghost" ... onClick={() => setDeleteConfirm(true)}>
    Excluir
  </Button>
</div>
```

Para:
```tsx
{/* Ações */}
<div className="pt-4 border-t space-y-3">
  <div>
    <Label>Alterar Status</Label>
    <Select...>
  </div>
  
  {/* Botões Editar e Excluir lado a lado */}
  <div className="flex items-center justify-end gap-2 pt-2">
    <Button 
      variant="ghost" 
      size="sm"
      className="text-muted-foreground hover:text-foreground"
      onClick={startEditing}
    >
      <Pencil className="h-3.5 w-3.5 mr-1.5" />
      Editar
    </Button>
    <Button 
      variant="ghost" 
      size="sm"
      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      onClick={() => setDeleteConfirm(true)}
    >
      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
      Excluir
    </Button>
  </div>
</div>
```

**4. Atualizar o AlertDialog de exclusao (linhas 941-961)**

Adicionar campo de texto para confirmar o nome do processo:

```tsx
<AlertDialog open={deleteConfirm} onOpenChange={(open) => {
  setDeleteConfirm(open);
  if (!open) setDeleteConfirmText('');
}}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Excluir protocolo?</AlertDialogTitle>
      <AlertDialogDescription className="space-y-3">
        <p>Esta ação não pode ser desfeita. O protocolo e todas as suas etapas serão excluídos permanentemente.</p>
        <p className="font-medium">Para confirmar, digite: <span className="text-destructive">{protocolo.nome}</span></p>
        <Input
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder="Digite o nome do processo"
          className="mt-2"
        />
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
      <AlertDialogAction 
        onClick={handleDelete}
        disabled={saving || deleteConfirmText !== protocolo.nome}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Excluir
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Resultado Visual

**Tab Resumo - Antes:**
```
                                    [Editar]
DESCRICAO
...

DATA DE INICIO    PREVISAO
...               ...

OBSERVACOES
...

ALTERAR STATUS
[dropdown]

[Excluir]
```

**Tab Resumo - Depois:**
```
DESCRICAO
...

DATA DE INICIO    PREVISAO
...               ...

OBSERVACOES
...

ALTERAR STATUS
[dropdown]
                        [Editar]  [Excluir]
```

**Dialog de Exclusao - Depois:**
```
+------------------------------------------+
|  Excluir protocolo?                      |
|                                          |
|  Esta ação não pode ser desfeita...      |
|                                          |
|  Para confirmar, digite: NOME_PROCESSO   |
|  [___________________________________]   |
|                                          |
|            [Cancelar]  [Excluir]         |
+------------------------------------------+
```
O botao Excluir so fica habilitado quando o texto digitado for exatamente igual ao nome do processo.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Project/ProjectProtocoloDrawer.tsx` | Adicionar estado, remover botao Editar do topo, colocar Editar ao lado do Excluir, implementar dupla confirmacao |

