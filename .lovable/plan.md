
## Exibir Tribunal nas Credenciais do Super Admin

### Problema Identificado

O campo `system_name` (tribunal) já está sendo salvo corretamente no banco de dados quando o usuário cadastra credenciais. Porém, esse campo **não está sendo exibido** no painel Super Admin.

Dados no banco (credenciais do Alan/Solvenza):
- EPROC - TJSC - 1º grau
- EPROC - TJRS - 1º grau  
- EPROC - TRF4 - 1º grau
- PJE TJRO - 1º grau
- PJE TJMG - 1º grau

---

### Correções Necessárias

#### 1. Hook `useAllCredenciaisPendentes.ts`

Adicionar o campo `system_name` na query e interface:

```typescript
interface CredencialPendenteComTenant {
  // ... campos existentes ...
  system_name: string | null;  // ADICIONAR
}

// Na query SELECT:
.select(`
  id,
  tenant_id,
  cpf,
  status,
  created_at,
  system_name,  // ADICIONAR
  oabs_cadastradas (...)
`)

// No mapeamento:
system_name: c.system_name || null,
```

---

#### 2. Componente `CredenciaisCentralDialog.tsx`

Exibir o tribunal junto com os dados da credencial:

```tsx
{/* Adicionar após o CPF */}
{cred.system_name && (
  <div className="flex items-center gap-2 text-sm">
    <Scale className="h-3 w-3 text-muted-foreground" />
    <span className="text-muted-foreground">
      {cred.system_name}
    </span>
  </div>
)}
```

---

#### 3. Aba "Recebidas" no `TenantCredenciaisDialog.tsx`

Adicionar coluna de Tribunal na tabela de credenciais recebidas:

```tsx
<TableHead>Tribunal</TableHead>
// ...
<TableCell>
  {credencial.system_name ? (
    <Badge variant="outline" className="text-xs">
      {credencial.system_name}
    </Badge>
  ) : (
    <span className="text-muted-foreground text-xs">-</span>
  )}
</TableCell>
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useAllCredenciaisPendentes.ts` | Adicionar `system_name` na interface e query |
| `src/components/SuperAdmin/CredenciaisCentralDialog.tsx` | Exibir tribunal na lista |
| `src/components/SuperAdmin/TenantCredenciaisDialog.tsx` | Adicionar coluna Tribunal na tabela |

---

### Resultado Visual Esperado

**Central de Credenciais (visão geral):**
```
┌─────────────────────────────────────────────────────────────┐
│  🏢 Solvenza                                    5 credenciais│
├─────────────────────────────────────────────────────────────┤
│  [OAB 123/PR]  Daniel                                       │
│  CPF: 091.632.379-03                                        │
│  ⚖️ EPROC - TJSC - 1º grau                                  │
│                                         28/01/2026 às 16:58 │
├─────────────────────────────────────────────────────────────┤
│  [OAB 123/PR]  Daniel                                       │
│  CPF: 091.632.379-03                                        │
│  ⚖️ PJE TJMG - 1º grau                                      │
│                                         28/01/2026 às 15:34 │
└─────────────────────────────────────────────────────────────┘
```

**Tabela de Credenciais Recebidas (por tenant):**
```
| OAB       | CPF           | Tribunal           | Status   |
|-----------|---------------|-------------------|----------|
| 123/PR    | 091.***.***-03| EPROC - TJSC - 1º | Pendente |
| 123/PR    | 091.***.***-03| PJE TJMG - 1º     | Pendente |
```
