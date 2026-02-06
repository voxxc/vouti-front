
# Nova Aba "Timezone" na Página Extras

## Resumo
Adicionar uma nova aba "Timezone" na página Extras, visível apenas para usuários com perfil Admin, permitindo definir o fuso horário do tenant. Se nenhum timezone for definido, o sistema usará o padrão "America/Sao_Paulo" (São Paulo, Sul e Sudeste do Brasil).

---

## Opções de Timezone (conforme print)

| Label | Valor IANA |
|-------|-----------|
| São Paulo, Sul e Sudeste do Brasil (BA, GO, DF, MG, ES) - EST | `America/Sao_Paulo` |
| Cuiabá, Sudoeste do Brasil (MT, MS) - WST | `America/Cuiaba` |
| Fortaleza, Nordeste do Brasil (AP, leste do PA, MA, PI, CE) - EST | `America/Fortaleza` |
| Maceió, Este Nordeste do Brasil (AL, SE, TO) - EST | `America/Maceio` |
| Manaus, Noroeste do Brasil (RR, oeste do PA, AM, RO) - WST | `America/Manaus` |
| Noronha, Fernando de Noronha - FST | `America/Noronha` |
| Rio Branco, Acre - AST | `America/Rio_Branco` |
| Bahia, Brasil - BRT | `America/Bahia` |

---

## Arquitetura

A tabela `tenants` já possui uma coluna `settings` do tipo JSONB. O timezone será armazenado nesta coluna:

```json
{
  "timezone": "America/Sao_Paulo"
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Extras.tsx` | Adicionar aba "Timezone" (apenas admins) |
| `src/components/Extras/TimezoneTab.tsx` | NOVO - Componente de configuração de timezone |
| `src/hooks/useTenantSettings.ts` | NOVO - Hook para ler/atualizar settings do tenant |

---

## Extras.tsx - Mudanças

1. Adicionar 'timezone' ao tipo TabType
2. Importar componente TimezoneTab
3. Adicionar botão na navegação (condicionado a isAdmin)
4. Renderizar componente no conteúdo

```tsx
type TabType = 'perfil' | 'aniversarios' | 'google-agenda' | 'timezone';

// Na navegação
{isAdmin && (
  <TabButton 
    active={activeTab === 'timezone'} 
    onClick={() => setActiveTab('timezone')}
  >
    Timezone
  </TabButton>
)}

// No conteúdo
{activeTab === 'timezone' && isAdmin && <TimezoneTab />}
```

---

## TimezoneTab.tsx - Estrutura

```text
Timezone
────────

Defina o fuso horário padrão para este escritório.
Este timezone será utilizado em todos os cálculos de
datas e prazos do sistema.

┌──────────────────────────────────────────────────────────┐
│  FUSO HORÁRIO LOCAL     [▼ Select dropdown            ] │
└──────────────────────────────────────────────────────────┘

                                                   [Salvar]
```

### Componente

```tsx
const TIMEZONE_OPTIONS = [
  { value: "America/Sao_Paulo", label: "São Paulo, Sul e Sudeste do Brasil (BA, GO, DF, MG, ES) - EST" },
  { value: "America/Cuiaba", label: "Cuiabá, Sudoeste do Brasil (MT, MS) - WST" },
  { value: "America/Fortaleza", label: "Fortaleza, Nordeste do Brasil (AP, leste do PA, MA, PI, CE) - EST" },
  { value: "America/Maceio", label: "Maceió, Este Nordeste do Brasil (AL, SE, TO) - EST" },
  { value: "America/Manaus", label: "Manaus, Noroeste do Brasil (RR, oeste do PA, AM, RO) - WST" },
  { value: "America/Noronha", label: "Noronha, Fernando de Noronha - FST" },
  { value: "America/Rio_Branco", label: "Rio Branco, Acre - AST" },
  { value: "America/Bahia", label: "Bahia, Brasil - BRT" },
];

const DEFAULT_TIMEZONE = "America/Sao_Paulo";
```

---

## useTenantSettings.ts - Hook

```tsx
export const useTenantSettings = () => {
  // Buscar tenant atual do usuário
  // Ler settings.timezone
  // Função para atualizar timezone
  
  const updateTimezone = async (timezone: string) => {
    await supabase
      .from('tenants')
      .update({ 
        settings: { 
          ...currentSettings, 
          timezone 
        } 
      })
      .eq('id', tenantId);
  };
  
  return { 
    timezone: settings?.timezone || DEFAULT_TIMEZONE,
    updateTimezone,
    loading 
  };
};
```

---

## Lógica de Permissão

- **RLS**: A tabela `tenants` já possui política que permite super admins e admins do próprio tenant modificarem
- **UI**: A aba só aparece para usuários com `userRole === 'admin'`

---

## Fluxo do Usuário

1. Admin acessa Extras
2. Clica na aba "Timezone"
3. Vê dropdown com opções de timezone
4. Seleciona o timezone desejado
5. Clica em "Salvar"
6. Toast de sucesso confirma a alteração

---

## Valor Padrão

Se o admin não definir timezone, o sistema assume:
- **Label**: São Paulo, Sul e Sudeste do Brasil (BA, GO, DF, MG, ES) - EST
- **Valor IANA**: `America/Sao_Paulo`
