

## Duas correções de logo

### 1. Remover logo "vouti." do header do Dashboard

O logo adicionado ao lado da barra de pesquisa rapida no header do `DashboardLayout.tsx` (linhas 197-199) sera removido. Nao foi solicitado e sera revertido.

### 2. Trocar nuvem por "vouti.crm" no header do CRM (`WhatsAppSidebar.tsx`)

No header da sidebar do CRM (linha 175-178), substituir o `CloudIcon` + texto "Vouti.CRM" pela nova identidade:

- Remover import do `CloudIcon`
- Substituir por texto estilizado: **vouti** (preto/foreground) + **.crm** (preto/foreground)
- Estilo: `font-black`, `tracking-tight`, `lowercase` (mesmo padrao do `LogoVouti`)

```
Antes:  [nuvem] Vouti.CRM
Depois: vouti.crm  (tudo em cor preta/foreground, font-black)
```

### Arquivos a editar

1. `src/components/Dashboard/DashboardLayout.tsx` - remover `LogoVouti` do header
2. `src/components/WhatsApp/WhatsAppSidebar.tsx` - trocar nuvem por logo texto "vouti.crm"

