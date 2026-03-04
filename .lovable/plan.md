

## Diagnóstico: Por que a página pública está lenta

A página `/:username` carrega lentamente por **2 motivos principais**, nenhum deles relacionado às queries do banco (que são apenas 3, com índices corretos):

### Problema 1: Bundle monolítico (principal)
O `App.tsx` importa **todas as 60+ páginas** de forma estática (sem lazy loading). Um visitante anônimo acessando `vouti.co/danieldemorais` precisa baixar e parsear o JavaScript de Dashboard, CRM, WhatsApp, Controladoria, Financial, etc — tudo antes de renderizar qualquer coisa.

### Problema 2: Inicialização de auth desnecessária
O Supabase client está configurado com `persistSession: true` e `autoRefreshToken: true`. Para visitantes anônimos da página pública, isso ainda tenta ler localStorage e verificar sessão, adicionando latência desnecessária.

---

### Solução

**1. Lazy loading das páginas no App.tsx**
- Converter todos os imports de páginas para `React.lazy()` + `Suspense`
- A página `LinkPublicProfile` será carregada isoladamente, resultando num bundle mínimo
- Impacto estimado: redução de 80%+ no tamanho do JS carregado para visitantes públicos

**2. Supabase client leve para páginas públicas**
- Criar `src/integrations/supabase/publicClient.ts` — um client Supabase sem persistência de sessão (`persistSession: false`, `autoRefreshToken: false`)
- Usar esse client no `LinkPublicProfile.tsx` em vez do client padrão
- Elimina a tentativa de restaurar sessão auth para visitantes anônimos

**3. Query única (otimização extra)**
- Substituir as 3 queries separadas (profile → links + collections) por uma única query que busca o profile com links e collections via join, reduzindo de 2 roundtrips para 1
- Na prática: buscar profile primeiro, depois links+collections em paralelo (já está assim), mas podemos ao menos eliminar a serialização profile→resto

### Arquivos a editar
| Arquivo | Mudança |
|---------|---------|
| `src/integrations/supabase/publicClient.ts` | **Novo** — client leve sem auth |
| `src/pages/LinkPublicProfile.tsx` | Usar publicClient em vez de supabase |
| `src/App.tsx` | Converter imports para `React.lazy()` com `Suspense` |

