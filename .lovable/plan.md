
# Adicionar Aba de Deletar Credenciais no TenantCredenciaisDialog

## Objetivo

Adicionar uma nova aba dentro do dialog de credenciais do cliente no SuperAdmin que permita deletar credenciais do cofre Judit.

## Estrutura Atual

O `TenantCredenciaisDialog` ja possui 4 abas:
1. **Recebidas** - Lista credenciais recebidas do cliente
2. **Enviar Pendente** - Envia credenciais pendentes para Judit
3. **Envio Direto** - Envia credenciais diretamente sem cadastro previo
4. **Historico** - Mostra credenciais ja enviadas para Judit

## Nova Aba: Deletar Credenciais

Adicionar uma 5a aba chamada **"Deletar"** que permitira:
- Selecionar uma credencial do historico (credenciais_judit)
- Confirmar a exclusao
- Chamar a API Judit para remover a credencial do cofre

---

## Alteracoes Tecnicas

### 1. Criar Edge Function: judit-deletar-credencial

**Arquivo:** `supabase/functions/judit-deletar-credencial/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') { ... }

  try {
    const JUDIT_API_KEY = Deno.env.get('JUDIT_API_KEY');
    const { systemName, customerKey } = await req.json();

    // Chamar DELETE em https://crawler.prod.judit.io/credentials
    const response = await fetch('https://crawler.prod.judit.io/credentials', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'api-key': JUDIT_API_KEY,
      },
      body: JSON.stringify({
        system_name: systemName,
        customer_key: customerKey,
      }),
    });

    // Retornar resposta
    return new Response(JSON.stringify({ success: true }), ...);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), ...);
  }
});
```

### 2. Atualizar Hook: useTenantCredenciais.ts

Adicionar mutation `deletarCredencialJudit`:

```typescript
const deletarCredencialJudit = useMutation({
  mutationFn: async ({ 
    credencialJuditId, 
    systemName, 
    customerKey 
  }: { 
    credencialJuditId: string; 
    systemName: string; 
    customerKey: string; 
  }) => {
    // Chamar edge function
    const response = await supabase.functions.invoke('judit-deletar-credencial', {
      body: { systemName, customerKey },
    });

    if (response.error) throw new Error(response.error.message);

    // Deletar registro local da tabela credenciais_judit
    const { error } = await supabase
      .from('credenciais_judit')
      .delete()
      .eq('id', credencialJuditId);

    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tenant-credenciais-judit', tenantId] });
    toast.success('Credencial removida do cofre Judit');
  },
});
```

### 3. Atualizar TenantCredenciaisDialog.tsx

**3.1 Adicionar Tab de Deletar ao TabsList (linha 208):**

De 4 colunas para 5:
```tsx
<TabsList className="grid w-full grid-cols-5">
  <TabsTrigger value="recebidas">...</TabsTrigger>
  <TabsTrigger value="enviar">...</TabsTrigger>
  <TabsTrigger value="direto">...</TabsTrigger>
  <TabsTrigger value="deletar">Deletar</TabsTrigger>
  <TabsTrigger value="historico">Historico</TabsTrigger>
</TabsList>
```

**3.2 Importar icone Trash2:**
```tsx
import { ..., Trash2 } from 'lucide-react';
```

**3.3 Adicionar estados para deletar:**
```tsx
const [deletandoId, setDeletandoId] = useState<string | null>(null);
```

**3.4 Adicionar TabsContent para "deletar" (apos linha 493):**
```tsx
<TabsContent value="deletar" className="mt-4">
  <div className="space-y-4">
    <div className="text-sm text-muted-foreground mb-4">
      Selecione uma credencial para remover do cofre Judit. 
      Esta acao nao pode ser desfeita.
    </div>
    
    <ScrollArea className="h-[400px]">
      {credenciaisJudit.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          Nenhuma credencial no cofre Judit.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Key</TableHead>
              <TableHead>Sistema</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Acao</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {credenciaisJudit.map((cred) => (
              <TableRow key={cred.id}>
                <TableCell>{cred.customer_key}</TableCell>
                <TableCell>{cred.system_name}</TableCell>
                <TableCell>{formatCpf(cred.username)}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeletarCredencial(cred)}
                    disabled={deletandoId === cred.id}
                  >
                    {deletandoId === cred.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ScrollArea>
  </div>
</TabsContent>
```

**3.5 Adicionar handler de deletar:**
```tsx
const handleDeletarCredencial = async (cred: CredencialJudit) => {
  if (!confirm(`Remover credencial ${cred.customer_key} do sistema ${cred.system_name}?`)) {
    return;
  }
  
  setDeletandoId(cred.id);
  try {
    await deletarCredencialJudit.mutateAsync({
      credencialJuditId: cred.id,
      systemName: cred.system_name,
      customerKey: cred.customer_key,
    });
  } finally {
    setDeletandoId(null);
  }
};
```

---

## Arquivos a Criar/Modificar

1. **CRIAR:** `supabase/functions/judit-deletar-credencial/index.ts` - Edge function para DELETE na API Judit
2. **EDITAR:** `src/hooks/useTenantCredenciais.ts` - Adicionar mutation deletarCredencialJudit
3. **EDITAR:** `src/components/SuperAdmin/TenantCredenciaisDialog.tsx` - Adicionar aba "Deletar"

---

## Fluxo de Exclusao

```text
Usuario clica em Deletar
       |
       v
Confirmacao via confirm()
       |
       v
Chama Edge Function judit-deletar-credencial
       |
       v
DELETE https://crawler.prod.judit.io/credentials
  { system_name, customer_key }
       |
       v
Deleta registro em credenciais_judit
       |
       v
Atualiza lista na interface
```

## Resultado Esperado

1. Nova aba "Deletar" no dialog de credenciais
2. Lista credenciais enviadas para Judit
3. Botao de exclusao para cada credencial
4. Confirmacao antes de deletar
5. Remove da API Judit e do banco local
