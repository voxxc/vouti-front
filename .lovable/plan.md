
# Redesign Minimalista do Drawer de Processos

## Objetivo

Transformar a navegação do drawer de processos para um estilo hiper-minimalista, seguindo o mesmo padrão visual já utilizado no ClienteDetails (labels clicáveis simples com linha inferior ativa).

---

## Mudancas Visuais

### 1. Navegacao das Abas (TabsList)

**Antes:**
```
[icon] Resumo  [icon] Etapas 2/5  [icon] Prazos 3/4  [icon] Vínculo  [icon] Histórico  [icon] Relatório
```
Tabs com background, icones, badges e estilo "botão".

**Depois:**
```
Resumo   Etapas   Prazos   Vínculo   Histórico   Relatório
   ____
```
Apenas texto simples, sem icones. O item ativo tem uma linha inferior discreta. Sem backgrounds, sem bordas nas tabs.

---

### 2. Botao Excluir Processo

**Antes:**
```
[===========================================]
[      🗑️  Excluir Processo                ]
[===========================================]
```
Botão largo (w-full) com variant destructive.

**Depois:**
```
                              [🗑️ Excluir]
```
Botão pequeno, alinhado à direita ou discretamente posicionado, apenas texto com ícone pequeno, variant ghost ou link com cor vermelha sutil no hover.

---

## Implementacao Tecnica

### Arquivo: `src/components/Project/ProjectProtocoloDrawer.tsx`

**1. TabsList (linhas 420-456)**

Remover:
- Icones de cada TabsTrigger
- Badges de contagem nas tabs
- Classes de estilo das tabs (border-b, rounded-none, etc.)

Adicionar:
- Estilo de navegação por texto simples
- Classe para linha inferior no item ativo (similar ao ClienteDetails)

Nova estrutura:
```tsx
<TabsList className="w-full h-auto bg-transparent p-0 justify-start gap-6 border-b">
  <TabsTrigger 
    value="resumo" 
    className="bg-transparent px-0 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none"
  >
    Resumo
  </TabsTrigger>
  <TabsTrigger 
    value="etapas" 
    className="bg-transparent px-0 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none"
  >
    Etapas
  </TabsTrigger>
  {/* Mesma estrutura para: Prazos, Vínculo, Histórico, Relatório */}
</TabsList>
```

**2. Botao Excluir (linhas 628-636)**

Substituir:
```tsx
<Button 
  variant="destructive" 
  className="w-full"
  onClick={() => setDeleteConfirm(true)}
  disabled={saving}
>
  <Trash2 className="h-4 w-4 mr-2" />
  Excluir Processo
</Button>
```

Por:
```tsx
<Button 
  variant="ghost" 
  size="sm"
  className="text-muted-foreground hover:text-destructive"
  onClick={() => setDeleteConfirm(true)}
  disabled={saving}
>
  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
  Excluir
</Button>
```

---

## Resultado Final

| Elemento | Antes | Depois |
|----------|-------|--------|
| Tabs | Botões com ícones e badges | Texto simples com underline ativo |
| Excluir | Botão vermelho largo | Link discreto pequeno |
| Visual geral | Carregado | Limpo e minimalista |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Project/ProjectProtocoloDrawer.tsx` | Refatorar TabsList para texto simples + reduzir botão Excluir |
