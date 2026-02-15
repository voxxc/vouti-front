

## Repaginar Homepage - Dinamica + Imagens Geradas

### Mudancas Solicitadas

**1. Header - Adicionar ponto vermelho**
Linha 182: Mudar de `Vou<span>ti</span>` para `Vou<span>ti</span><span className="text-[#E11D48]">.</span>`

**2. Statement - Remover "Vouti"**
Linhas 281-283: Remover o `<span>` com o logo Vouti, manter apenas o texto "Transforme seu escritorio."

**3. Secoes Dinamicas com Imagens Geradas por IA**
Adicionar 3 novas secoes de showcase entre o Features Grid e o Statement, inspiradas nos prints de referencia. Cada secao tera:
- Layout alternado: imagem esquerda + texto direita, depois texto esquerda + imagem direita
- Titulo bold, paragrafo descritivo, 3 bullet points com icone check
- Link CTA discreto "Saiba mais >"

**Secoes planejadas:**

| Secao | Titulo | Conteudo |
|---|---|---|
| 1 | "Acompanhe seus processos e publicacoes em tempo real" | Monitoramento automatico por OAB/CNPJ, receba intimacoes, reduza erros. Imagem: mockup de tela de publicacoes/processos |
| 2 | "Gestao financeira integrada e profissional" | Controle de honorarios, fluxo de caixa, lembretes de pagamento. Imagem: mockup de tela financeira |
| 3 | "Organize prazos e tarefas em um so lugar" | Alertas automaticos, agenda centralizada, produtividade da equipe. Imagem: mockup de tela de agenda/prazos |

**4. Geracao de Imagens via IA**
Criar uma edge function `generate-landing-images` que:
- Usa a API `ai.gateway.lovable.dev` com modelo `google/gemini-2.5-flash-image`
- Gera 3 imagens de mockups de interface (estilo clean, fundo claro, mostrando telas do software juridico)
- Faz upload para Supabase Storage (bucket `landing-images`)
- As URLs sao usadas nas secoes da homepage

Para o primeiro deploy, gerar as imagens e salvar as URLs. O componente HomePage busca as imagens do storage.

**5. Animacoes para dinamismo**
- Adicionar animacoes de entrada (fade-in + slide-up) nas secoes usando CSS animations com `IntersectionObserver`
- Criar um hook `useScrollAnimation` para detectar quando secoes entram na viewport
- Aplicar transicoes suaves nos cards de planos (hover scale sutil)

---

### Detalhes Tecnicos

**Arquivos afetados:**

| Arquivo | Mudanca |
|---|---|
| `src/pages/HomePage.tsx` | Header (ponto vermelho), Statement (remover Vouti), novas secoes de showcase, animacoes de scroll |
| `src/hooks/useScrollAnimation.ts` | NOVO - Hook para animacao de entrada ao scroll |
| `supabase/functions/generate-landing-images/index.ts` | NOVO - Edge function para gerar e armazenar imagens via IA |

**Hook useScrollAnimation:**
- Usa `IntersectionObserver` para detectar elementos entrando na viewport
- Retorna ref e classe CSS (`opacity-0 translate-y-8` -> `opacity-100 translate-y-0`)
- Threshold de 0.1 para ativar cedo

**Edge function generate-landing-images:**
- Endpoint POST que gera 3 imagens com prompts especificos
- Cada prompt descreve um mockup de interface juridica (publicacoes, financeiro, agenda)
- Upload automatico para bucket `landing-images` no Supabase Storage
- Retorna array de URLs publicas
- Usa `LOVABLE_API_KEY` (ja configurado)

**Secoes de showcase - Layout:**
- Grid de 2 colunas (lg:grid-cols-2)
- Alternancia: secao 1 e 3 = imagem esquerda, secao 2 = imagem direita
- Fundo alternado: branco e cinza claro (bg-gray-50)
- Bullet points com CheckCircle2 em vermelho (#E11D48)
- Texto e imagens com animacao de fade-in ao scroll

**Fluxo de imagens:**
1. Edge function gera imagens e salva no storage
2. Homepage busca as imagens do bucket `landing-images`
3. Fallback: se imagens nao existirem, mostra placeholder com gradiente sutil e texto

