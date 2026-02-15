

## Repaginar Homepage - Design Minimalista Premium

### Conceito

Inspirado nas referencias enviadas: fundo branco/claro, tipografia bold, espacamento generoso, sem firulas visuais (sem particulas, gradientes neon, video de fundo). Identidade visual: preto + vermelho (marca Vouti), clean e direto.

### Estrutura da Nova Homepage

A pagina atual tem 850 linhas com visual escuro, gradientes azul/cyan, video background, particulas animadas - tudo sera substituido por um design minimalista premium.

**Secoes da nova pagina (em ordem):**

1. **Header fixo** - Fundo branco, logo Vouti (preto + "ti" vermelho), nav minimalista, botao CTA discreto. Easter egg mantido.

2. **Hero** - Fundo branco limpo. Headline grande e bold: "O seu escritorio 360." (como na referencia). Subtitulo curto. Sem video, sem particulas, sem gradientes.

3. **Features Grid** - Duas colunas com bullets vermelhos (como na imagem 2):
   - Controle de Prazos / Kanban de Projetos
   - Gestao de Clientes / Controle Financeiro
   - Andamentos Processuais / Gestao de Trabalhos de Equipes
   - CRM c/ WhatsApp + IA / Agendamento de Reunioes
   - Gestao de Equipes / Gestao de Tokens 2FA
   - Modulos Exclusivos / **Documentos Inteligentes**

4. **Statement** - Frase de impacto: "Transforme seu escritorio." com logo Vouti no canto (como na referencia 2).

5. **Planos** - Mesmos planos atuais, mas com visual branco/preto, cards com borda fina, destaque minimalista no plano popular.

6. **Formulario CTA** - "Solicitar Demo" com campos simples, fundo cinza claro sutil.

7. **Footer** - Minimalista, uma linha com copyright e contato.

### Paleta de Cores

| Elemento | Cor |
|---|---|
| Fundo principal | Branco (#FFFFFF) |
| Texto principal | Preto (#0a0a0a) |
| Acento / bullets | Vermelho (#E11D48 ou similar ao logo) |
| Texto secundario | Cinza (#6b7280) |
| Bordas / divisores | Cinza claro (#e5e7eb) |
| CTA botao | Preto com texto branco |

### Detalhes Tecnicos

**Arquivo editado:** `src/pages/HomePage.tsx` (reescrita completa do JSX e dados)

**O que muda:**
- Remove: video background, particulas animadas, gradientes azul/cyan, fundo escuro (#0a0f1a), icones Lucide nos modulos, secao "About" com 3 cards, secao "Para quem e", secao depoimentos
- Mantem: logica do formulario (handleSubmitForm), easter egg (handleEasterEggSubmit), dados dos planos, imports do Supabase/toast/navigate
- Simplifica: modulos passam de cards com icones para lista com bullets vermelhos (estilo referencia)
- Tipografia: font-size grande, weight bold, spacing generoso
- Responsivo: mantido com abordagem mobile-first

**Secoes removidas** (simplificacao):
- "About" (3 cards Centralizacao/Automacao/Inteligencia) - redundante
- "Beneficios" (6 cards) - incorporado no hero/features
- "Para quem e" (4 personas) - removido para manter minimalismo
- "Depoimentos" (3 cards) - removido (eram fictícios)
- "Descricao" (bloco de texto longo) - substituido pela frase de impacto

**Secoes mantidas/adaptadas:**
- Header (redesenhado branco)
- Hero (redesenhado minimalista)
- Features (grid com bullets vermelhos)
- Planos (redesenhado branco)
- CTA/Formulario (redesenhado claro)
- Footer (simplificado)

### Resultado Esperado

Uma pagina que transmite premium e confianca, sem cara de template generico. Inspiracao direta nas imagens: tipografia bold, espacamento limpo, bullets vermelhos, marca Vouti com destaque, fundo branco.

