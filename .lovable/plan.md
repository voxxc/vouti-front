
## Melhorias na Visualização e Edição de Credenciais

### Contexto

O usuário identificou duas necessidades:
1. No formulário de credenciais do cliente: não há como verificar se a senha/secret digitados estão corretos antes de enviar
2. No Super Admin "Enviar Pendente": os campos estão read-only e não podem ser corrigidos se houver erro

---

### Alterações Planejadas

#### 1. SubscriptionDrawer - Adicionar Botão Visualizar Senha

**Arquivo:** `src/components/Support/SubscriptionDrawer.tsx`

Adicionar estados para controlar visibilidade:
```typescript
const [showSenha, setShowSenha] = useState(false);
const [showSecret, setShowSecret] = useState(false);
```

Adicionar import do ícone Eye/EyeOff (já existe no projeto).

Modificar os inputs de senha e secret (linhas 668-691):

**Campo Senha (antes):**
```tsx
<Input
  id="cred-senha"
  type="password"
  value={credencialForm.senha}
  onChange={...}
  placeholder="Senha do sistema"
/>
```

**Campo Senha (depois):**
```tsx
<div className="flex gap-2">
  <Input
    id="cred-senha"
    type={showSenha ? "text" : "password"}
    value={credencialForm.senha}
    onChange={...}
    placeholder="Senha do sistema"
  />
  <Button
    variant="ghost"
    size="icon"
    type="button"
    onClick={() => setShowSenha(!showSenha)}
  >
    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
  </Button>
</div>
```

Mesma alteração para o campo Secret.

---

#### 2. TenantCredenciaisDialog - Permitir Edição no Enviar Pendente

**Arquivo:** `src/components/SuperAdmin/TenantCredenciaisDialog.tsx`

Adicionar estados para armazenar valores editáveis:
```typescript
const [editCpf, setEditCpf] = useState('');
const [editSenha, setEditSenha] = useState('');
```

Modificar `handleSelectCredencial` para inicializar os campos editáveis:
```typescript
const handleSelectCredencial = (id: string) => {
  setSelectedCredencialId(id);
  const cred = credenciaisCliente.find((c) => c.id === id);
  if (cred) {
    setEditCpf(cred.cpf);       // Novo
    setEditSenha(cred.senha);   // Novo
    const defaultKey = cred.oabs_cadastradas
      ? `${cred.oabs_cadastradas.oab_numero}/${cred.oabs_cadastradas.oab_uf}`
      : cred.cpf;
    setCustomerKey(defaultKey);
  }
};
```

Modificar os campos CPF e Senha na aba "Enviar Pendente" (linhas 377-386):

**Antes:**
```tsx
<div className="space-y-2">
  <Label>CPF (Username)</Label>
  <Input value={formatCpf(selectedCredencial.cpf)} readOnly className="bg-background" />
</div>
<div className="space-y-2">
  <Label>Senha</Label>
  <Input value={selectedCredencial.senha} readOnly className="bg-background" />
</div>
```

**Depois:**
```tsx
<div className="space-y-2">
  <Label>CPF (Username)</Label>
  <Input 
    value={editCpf} 
    onChange={(e) => setEditCpf(e.target.value)}
    placeholder="000.000.000-00"
  />
</div>
<div className="space-y-2">
  <Label>Senha</Label>
  <div className="flex gap-2">
    <Input 
      type={senhasVisiveis['edit-senha'] ? 'text' : 'password'}
      value={editSenha} 
      onChange={(e) => setEditSenha(e.target.value)}
      placeholder="Senha do sistema"
    />
    <Button
      variant="ghost"
      size="icon"
      type="button"
      onClick={() => toggleSenhaVisivel('edit-senha')}
    >
      {senhasVisiveis['edit-senha'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </Button>
  </div>
  <p className="text-xs text-muted-foreground">
    Você pode editar se a senha estiver incorreta
  </p>
</div>
```

Modificar `handleEnviarParaJudit` para usar os valores editados:
```typescript
await enviarParaJudit.mutateAsync({
  credencialId: selectedCredencial.id,
  cpf: editCpf,       // Usar valor editado
  senha: editSenha,   // Usar valor editado
  secret,
  customerKey,
  systemName,
  oabId: selectedCredencial.oab_id || undefined,
});
```

Resetar campos ao limpar seleção:
```typescript
setSelectedCredencialId('');
setEditCpf('');      // Limpar
setEditSenha('');    // Limpar
setSecret('');
setCustomerKey('');
setSystemName('');
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Support/SubscriptionDrawer.tsx` | Adicionar toggle de visibilidade para campos senha e secret |
| `src/components/SuperAdmin/TenantCredenciaisDialog.tsx` | Tornar CPF e Senha editáveis na aba "Enviar Pendente" |

---

### Benefícios

**Para o usuário (cliente):**
- Pode visualizar a senha/secret que digitou antes de enviar
- Evita erros de digitação que causam retrabalho

**Para o Super Admin:**
- Pode corrigir senhas incorretas diretamente na interface
- Não precisa pedir ao cliente para reenviar credenciais
- Agiliza o processo de cadastro no cofre Judit
