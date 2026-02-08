
# Plano: Trocar Logo e Nome para Vouti.Bot

## Alteração Simples

Trocar o ícone e nome no header da sidebar do WhatsApp em ambos os componentes (Tenant e Super Admin).

## De/Para

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Ícone | Círculo verde com MessageSquare | Ícone Bot (robô) |
| Nome | "WhatsApp" | "Vouti.Bot" |

## Arquivos a Modificar

### 1. `src/components/WhatsApp/WhatsAppSidebar.tsx`

Linhas 73-78:
```typescript
// ANTES:
<div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
  <MessageSquare className="h-4 w-4 text-white" />
</div>
<span className="font-semibold text-foreground">WhatsApp</span>

// DEPOIS:
<div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
  <Bot className="h-4 w-4 text-white" />
</div>
<span className="font-semibold text-foreground">Vouti.Bot</span>
```

### 2. `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppSidebar.tsx`

Mesma alteração nas linhas 72-75.

## Visual Esperado

```text
┌─────────────────────────┐
│  ←  🤖 Vouti.Bot        │  ← Novo header
├─────────────────────────┤
│  📥 Caixa de Entrada    │
│  💬 Conversas           │
│  ...                    │
└─────────────────────────┘
```

## Resultado

- Ícone de robô (Bot) em círculo com cor primária (dourado/gold do tema)
- Nome "Vouti.Bot" no lugar de "WhatsApp"
- Identidade visual alinhada com o produto VOUTI
