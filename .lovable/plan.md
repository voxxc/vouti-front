
## O que está acontecendo (causa real do “não gera QR Code”)

Pelos logs que você já trouxe, o backend **está gerando e retornando o QR Code** (vem um `value` enorme começando com `data:image/png;base64,...`).

O problema é no front-end: hoje o código está montando o `src` do `<img>` assim:

- ele **já recebe** `qrCode = "data:image/png;base64,...."`
- mas renderiza como: `src={"data:image/png;base64," + qrCode}`

Isso vira:
```text
data:image/png;base64,data:image/png;base64,iVBOR...
```
Resultado: a imagem fica inválida e “parece” que não gerou QR Code (ou fica “carregando”, ou mostra toast de sucesso mas sem imagem).

Eu encontrei esse bug em **dois lugares**:
- `src/components/SuperAdmin/WhatsApp/SuperAdminAgentsSettings.tsx` (o que você está usando em `/super-admin/bot`)
- `src/components/WhatsApp/settings/AgentConfigDrawer.tsx` (fluxo de tenant/drawer)

Além disso, existe um terceiro componente antigo que também tem a mesma montagem de `src`:
- `src/components/SuperAdmin/WhatsApp/SuperAdminAgentConfigDrawer.tsx` (se ainda estiver sendo usado em algum fluxo)

---

## Objetivo da correção

1) Fazer o front-end aceitar **ambos os formatos** que a Z-API/Edge Function podem devolver:
- Formato A: `"data:image/png;base64,...."` (data URI completo)
- Formato B: `"iVBORw0KGgo..."` (somente base64)

2) Garantir que, se o QR vier no formato A, o `<img>` use diretamente sem “duplicar” prefixo.

3) Melhorar o feedback de erro: se vier `success: false` do Edge Function ou vier JSON com erro (ex: 405/NotAllowed), exibir a mensagem real no toast em vez de “Erro genérico”.

---

## Mudanças planejadas (front-end)

### A) Criar uma função utilitária pequena (local ou helper) para normalizar a URL da imagem
Regra:
- se `value` começar com `data:image`, usar do jeito que está
- senão, prefixar `data:image/png;base64,`

Pseudo:
```ts
function toQrSrc(value: string) {
  const v = value.trim();
  if (v.startsWith("data:image/")) return v;
  return `data:image/png;base64,${v}`;
}
```

### B) Ajustar o render do QR Code no Super Admin (rota /super-admin/bot)
Arquivo: `src/components/SuperAdmin/WhatsApp/SuperAdminAgentsSettings.tsx`

Trocar:
```tsx
<img src={`data:image/png;base64,${qrCode}`} ... />
```
Por:
```tsx
<img src={toQrSrc(qrCode)} ... />
```

E também manter `setQrCode(qrValue)` igual, só corrigindo o `src`.

### C) Ajustar o render do QR Code no Drawer do Tenant
Arquivo: `src/components/WhatsApp/settings/AgentConfigDrawer.tsx`

Mesma troca no `<img>`.

### D) (Opcional, mas recomendado) Ajustar o componente antigo do Super Admin Drawer
Arquivo: `src/components/SuperAdmin/WhatsApp/SuperAdminAgentConfigDrawer.tsx`

Mesma troca no `<img>` para evitar regressões se esse componente ainda aparecer em algum lugar.

---

## Mudanças planejadas (Edge Function) — pequenas e seguras

Arquivo: `supabase/functions/whatsapp-zapi-action/index.ts`

Hoje ela pode retornar:
- se `content-type` for imagem: `{ value: "data:image/png;base64,..." }`
- se for JSON: repassa como vier do Z-API (pode ser base64 puro ou data-uri)

Eu não vou quebrar isso, mas vou adicionar duas melhorias:

1) **Padronizar a resposta para sempre ter também um campo `dataUri`**:
- Se já vier `value` como data-uri, `dataUri = value`
- Se vier base64 puro, `dataUri = "data:image/png;base64," + value`

2) Quando a Z-API responder com erro JSON (ex: 405), **propagar isso de forma mais explícita** (pra UI mostrar a mensagem certa).

Isso deixa o front mais simples e melhora diagnóstico.

---

## Sequência de implementação

1) Corrigir `src` do `<img>` no `SuperAdminAgentsSettings.tsx` (principal).
2) Corrigir `src` do `<img>` no `AgentConfigDrawer.tsx` (evita o mesmo bug em outro painel).
3) (Se aplicável) Corrigir no `SuperAdminAgentConfigDrawer.tsx`.
4) Refinar Edge Function para retornar `dataUri` e propagar erros de forma consistente.
5) Validar manualmente no preview:
   - clicar “Conectar via QR Code”
   - confirmar que aparece a imagem
   - escanear e confirmar que o polling detecta `connected: true` e muda o status
   - testar com `Client-Token` vazio e preenchido (porque ele só deve ser enviado se preenchido)

---

## Critérios de aceite (como vamos saber que resolveu)

- Ao clicar “Conectar via QR Code”, aparece o QR Code visualmente (sem precisar abrir console).
- O toast “QR Code gerado” continua, mas agora a imagem aparece.
- Se a Z-API devolver erro (ex: 405), a UI mostra uma mensagem mais específica.
- O mesmo comportamento funciona no Super Admin e no painel de Tenant.

---

## Arquivos que vou mexer

- `src/components/SuperAdmin/WhatsApp/SuperAdminAgentsSettings.tsx`
- `src/components/WhatsApp/settings/AgentConfigDrawer.tsx`
- (opcional/segurança) `src/components/SuperAdmin/WhatsApp/SuperAdminAgentConfigDrawer.tsx`
- `supabase/functions/whatsapp-zapi-action/index.ts`

---

## Observação importante (sobre “você já conseguiu antes”)

Você está certo em ficar bravo: o backend estava respondendo com sucesso, mas o front-end estava “estragando” o valor retornado na hora de montar a imagem. Esse tipo de bug é extremamente frustrante porque parece falha de integração/endpoint, quando na real é só o `src` duplicando o prefixo.

Assim que você aprovar este plano, eu implemento a correção do `src` (que é o ponto mais crítico) e a gente deve ver o QR imediatamente.
