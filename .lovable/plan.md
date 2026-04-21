

## Ajustes na landing `/crm` — copy, badges e responsividade mobile

### Correção

Edições pontuais em `src/pages/CrmSalesLanding.tsx`:

1. **Remover badge "Gestão integrada para times comerciais"** do hero (badge acima do título).

2. **Atualizar subheadline (slogan)** para:
   > "O Vouti.CRM unifica gestão de equipes, projetos kanban e atendimento WhatsApp em uma única plataforma, para que seu time pare de pular entre 5 ferramentas."

3. **Substituir item "Multi-tenant isolado"** (na seção de diferenciais) por:
   - Título: **"Fluxo de Atendimento & IA"**
   - Descrição: **"Atendimento 24/7"**
   - Manter o mesmo ícone ou trocar por `Bot`/`Sparkles` (lucide-react), o que ficar mais coerente.

4. **Remover todas as referências a "Z-API"**:
   - No passo "Conexão WhatsApp" da seção "Como funciona" — trocar "Z-API ou Meta" por apenas "API oficial Meta" (ou "WhatsApp Business API").
   - Em qualquer outra menção ao longo do texto (FAQ, diferenciais, mockup) — sanitizar para falar apenas em "WhatsApp Business" / "API oficial".

5. **Mobile: substituir cards grandes por layout vertical compacto**:
   - **Seção dos 3 pilares (Equipes / Projetos / WhatsApp)**: no mobile (`< md`) virar uma lista vertical com cards compactos — ícone à esquerda (40px), título + descrição curta à direita, padding reduzido (`p-4` em vez de `p-8`), sem altura mínima forçada. No desktop mantém grid 3 colunas atual.
   - **Seção "Diferenciais"**: no mobile usar 1 coluna vertical com cards horizontais compactos (ícone + texto inline) em vez do grid atual de cards grandes empilhados. No desktop mantém o grid multicolunas.
   - **Seção "Como funciona"**: no mobile, cards de passo ficam mais finos (`py-4 px-4`), sem ilustração grande, apenas número + título + 1 linha de descrição.
   - **Mockup visual (inbox + kanban)**: no mobile reduzir altura, esconder colunas extras do kanban (mostrar só 1) — ou substituir por uma versão simplificada empilhada.
   - Reduzir espaçamentos verticais entre seções no mobile (`py-12` em vez de `py-20`) para diminuir o scroll total.

### Arquivos afetados

**Modificados:**
- `src/pages/CrmSalesLanding.tsx` — ajustes de copy, remoção do badge, troca do diferencial, sanitização de Z-API, classes responsivas dos cards.

**Sem mudanças:** rotas, banco, Edge Functions, hooks, outros componentes.

### Impacto

**Usuário final (UX):**
- Hero mais limpo (sem badge redundante) e com slogan mais direto que comunica a dor.
- Mensagem alinhada à oferta atual: API oficial Meta + IA 24/7, sem promessa de Z-API.
- Mobile: scroll significativamente mais curto, leitura mais rápida, cards compactos cabem melhor em telas pequenas (390px) sem desperdiçar altura.

**Dados:** nenhum impacto — apenas mudança de UI/copy.

**Riscos colaterais:**
- Visitantes que já tinham visto a página antes notarão a mudança de mensagem — desejado.
- Nenhum link ou rota é alterado.

**Quem é afetado:** público externo da landing `/crm` (visitantes em `vouti.co/crm`). Sem efeito em tenants ou clientes existentes.

### Validação

1. Acessar `/crm` no desktop (1440px) → hero sem o badge "Gestão integrada para times comerciais"; slogan novo presente; layout 3 colunas dos pilares preservado.
2. Buscar "Z-API" e "Multi-tenant isolado" no DOM → zero ocorrências.
3. Conferir card "Fluxo de Atendimento & IA" / "Atendimento 24/7" no lugar do antigo "Multi-tenant".
4. Redimensionar para mobile (390px) → cards dos 3 pilares ficam em coluna única, compactos (ícone + texto), sem padding excessivo.
5. Seção de diferenciais em mobile → 1 coluna, cards horizontais finos.
6. Como funciona em mobile → cards de passo compactos.
7. Scroll total da página em mobile reduzido (~30% menos altura) comparado ao layout anterior.
8. Formulário e CTAs continuam funcionando (envio do lead com `origem='vouti_crm_landing'`).
9. Tema claro/escuro mantém contraste em ambos.

