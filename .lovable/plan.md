
# Correção do Botão Landing Pages no CRM

## Problema Identificado

O botão "LANDING PAGES" no componente `CRMContent.tsx` não tem nenhuma funcionalidade - falta o `onClick` e o Dialog para selecionar landing pages.

**Arquivo afetado:** `src/components/CRM/CRMContent.tsx` (linhas 145-151)

```tsx
// Código atual (não funciona)
<Button 
  variant="default"
  className="gap-2"
>
  <Layout size={16} />
  LANDING PAGES
</Button>
```

## Solução

Adicionar:
1. Estado `isLandingPagesDialogOpen` para controlar o modal
2. Handler `onClick` no botão
3. Componente `Dialog` com as landing pages disponíveis

## Mudanças Técnicas

### Arquivo: `src/components/CRM/CRMContent.tsx`

1. **Importar componentes necessários** (Dialog, DialogContent, DialogHeader, DialogTitle, ScrollArea)

2. **Adicionar estado para controle do dialog**
```tsx
const [isLandingPagesDialogOpen, setIsLandingPagesDialogOpen] = useState(false);
```

3. **Adicionar onClick ao botão**
```tsx
<Button 
  variant="default"
  className="gap-2"
  title="Abrir lista de Landing Pages"
  onClick={() => setIsLandingPagesDialogOpen(true)}
>
```

4. **Adicionar o Dialog no final do componente** (antes do fechamento da div principal)
```tsx
<Dialog open={isLandingPagesDialogOpen} onOpenChange={setIsLandingPagesDialogOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Selecione uma Landing Page</DialogTitle>
    </DialogHeader>
    <ScrollArea className="h-[400px] pr-4">
      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={() => { window.open(tenantPath('/landing-1'), '_blank'); setIsLandingPagesDialogOpen(false); }}>
          Landing Page 1 - Agronegócio
        </Button>
        <Button variant="outline" onClick={() => { window.open(tenantPath('/office'), '_blank'); setIsLandingPagesDialogOpen(false); }}>
          Landing Page 2 - Advocacia
        </Button>
        {/* ... demais landing pages desabilitadas */}
      </div>
    </ScrollArea>
  </DialogContent>
</Dialog>
```

## Resultado Esperado

Ao clicar no botão "LANDING PAGES" no drawer do CRM, abre um modal com as opções de landing pages disponíveis, permitindo abrir cada uma em nova aba.
