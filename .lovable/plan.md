# Correções: Drawers sobrepostos e nomes de workspaces truncados

## 1) Quick Search abre projeto por baixo do Planejador

### Causa raiz
No `DashboardLayout.tsx`, ao selecionar um projeto/protocolo na Busca Rápida, abrimos o `ProjectDrawer` (estado independente `projectDrawerOpen`) sem fechar o `activeDrawer` corrente. Como Planejador, Agenda, CRM etc. são renderizados via `activeDrawer`, eles continuam abertos e o `ProjectDrawer` aparece sobreposto/embaixo.

### Correção
- Em `handleQuickProjectSelect` (e no callback `onSelectProtocolo` da `ProjectQuickSearch`), além de setar `selectedProjectId` e abrir o `ProjectDrawer`, chamar `setActiveDrawer(null)` para fechar qualquer drawer principal aberto (Planejador, Agenda, CRM, etc.).

### Arquivos afetados
- `src/components/Dashboard/DashboardLayout.tsx`

### Impacto
- UX: ao clicar num resultado da Busca Rápida, o drawer ativo (Planejador) fecha e o projeto abre limpo, sem sobreposição.
- Dados: nenhuma alteração.
- Risco colateral: se o usuário estava editando algo no Planejador sem salvar, o drawer fecha — comportamento esperado e consistente com a navegação por sidebar.
- Afetados: todos os usuários que usam Busca Rápida com algum drawer aberto.

### Validação
- Abrir Planejador → digitar na Busca Rápida → clicar num projeto: Planejador fecha, ProjectDrawer abre sozinho.
- Mesmo teste partindo de Agenda/CRM/WhatsApp drawers.

---

## 2) Nomes dos workspaces (abas) aparecem truncados

### Causa raiz
Em `ProjectWorkspaceTabs.tsx` (linha 153), cada aba tem `max-w-[120px] truncate`, cortando nomes como "DE BASTIANI COMÉRCIO ATACADISTA DE MADEIRAS LTDA" para "DE BASTIANI C...". Isso dificulta diferenciar workspaces de mesmo cliente.

### Correção
- Remover o `max-w-[120px] truncate` do `<span>` do nome da aba e usar `whitespace-nowrap` para que o nome apareça completo.
- O `ScrollArea` horizontal já existente cuida do overflow quando há muitas abas — abas largas passam a poder rolar lateralmente em vez de truncar.
- Opcional: aumentar `max-w` para algo generoso (ex.: `max-w-[260px]`) mantendo `truncate` como fallback apenas para nomes absurdamente longos (>30 chars já é o limite imposto na criação).

### Arquivos afetados
- `src/components/Project/ProjectWorkspaceTabs.tsx`

### Impacto
- UX: usuário consegue ler o nome completo de cada workspace, facilitando localizar o desejado.
- Dados: nenhuma alteração.
- Risco colateral: em projetos com muitos workspaces, a barra de abas precisará de scroll horizontal (já suportado pelo `ScrollArea`). Em telas muito estreitas, pode exigir mais rolagem.
- Afetados: todos os usuários que usam múltiplos workspaces dentro de um projeto.

### Validação
- Abrir um projeto com workspaces de nomes longos: nomes aparecem inteiros.
- Criar várias abas e validar que a barra rola lateralmente sem quebrar layout.

# Drive: preview interno no Vouti (sem sair da plataforma)

## Causa raiz

`drive.google.com` envia o header `X-Frame-Options: DENY`, então o Google bloqueia qualquer tentativa de carregar a interface dele dentro de um iframe — daí o erro 403. Não é problema do Vouti e não há configuração que contorne isso (é política de segurança do Google, vale para todo site).

A solução é não depender da UI do Google: usar a API do Drive (que já está integrada) para listar, baixar e **renderizar o conteúdo do arquivo dentro do próprio Vouti**.

## Correção

1. **Filtrar tipos não-renderizáveis**
   Em `DriveFileList`, esconder por padrão arquivos Google Docs/Sheets/Slides/Forms (mimeType `application/vnd.google-apps.*` exceto `folder`), já que só funcionam dentro do editor do Google. Adicionar um toggle "Mostrar arquivos do Google" para quem quiser ver e abrir em nova aba conscientemente.

2. **Novo componente `DriveFilePreview`** (modal sobre o drawer)
   Ao clicar num arquivo, abre um modal cheio-de-tela com o preview adequado ao tipo:
   - **PDF**: `<iframe>` apontando para um blob URL (gerado a partir do download via API → blob → `URL.createObjectURL`). Não usa o viewer do Google, é o PDF nativo do browser.
   - **Imagens** (`image/*`): `<img>` com o blob URL.
   - **Vídeo** (`video/*`): `<video controls>` com o blob URL.
   - **Áudio** (`audio/*`): `<audio controls>` com o blob URL.
   - **Texto/JSON/CSV** (`text/*`, `application/json`): lê o blob como texto e mostra num `<pre>` com scroll.
   - **Demais tipos**: card "Preview não disponível" com botões Download e (se for Google-doc e o toggle estiver ligado) "Abrir no Google".

3. **Cache de blob por sessão**
   O hook `useGoogleDrive` ganha `previewFile(file)` que retorna um blob URL e armazena num `Map` em memória, evitando re-download ao reabrir o mesmo arquivo. Revoga as URLs ao desmontar o drawer.

4. **Ajuste no clique do item**
   `DriveFileList` hoje provavelmente abre `webViewLink`. Trocar o comportamento padrão do clique do nome do arquivo para `onPreview(file)`; manter "Abrir no Google" como ação secundária no menu (só aparece se toggle ligado).

## Arquivos afetados

- `src/components/Drive/DriveFilePreview.tsx` (novo)
- `src/components/Drive/DriveFileList.tsx` (filtro de tipos + click → preview + toggle)
- `src/components/Drive/DriveDrawer.tsx` (montar o preview, limpar blobs no close)
- `src/hooks/useGoogleDrive.ts` (`previewFile`, cache de blob URLs)

## Impacto

**Usuário final:** clicar num PDF, foto ou vídeo do Drive abre direto dentro do Vouti, em tela cheia, sem redirecionar pro Google nem dar 403. A experiência fica parecida com um visualizador nativo. Arquivos do tipo Google Docs/Sheets/Slides ficam ocultos por padrão (com toggle pra mostrar), evitando frustração com cliques que não funcionam embutidos.

**Dados:** zero. Nenhuma migration, nenhuma alteração de RLS, nenhum dado novo persistido. Tudo é leitura via API já autorizada por OAuth do usuário e blobs efêmeros na memória do browser.

**Riscos colaterais:** arquivos grandes (>50 MB) baixados pra preview podem consumir RAM — mitigado com aviso "Arquivo grande, fazendo download…" e botão de cancelar. Blob URLs precisam ser revogados ao fechar o modal pra não vazar memória.

**Quem é afetado:** todos os usuários que usam o botão "Drive" no header do CRM/Controladoria. Não afeta nenhum outro módulo (CRM, agenda, financeiro continuam iguais).

## Validação

1. Conectar Drive, abrir drawer, clicar num PDF → renderiza inline.
2. Clicar numa imagem .jpg/.png → preview imediato.
3. Clicar num .mp4 → player de vídeo funciona.
4. Verificar que Google Docs/Sheets não aparecem na lista por padrão.
5. Ligar o toggle "Mostrar arquivos do Google" → eles aparecem e abrem em nova aba.
6. Fechar o modal e o drawer → console sem warnings de memória; reabrir o mesmo arquivo é instantâneo (cache).
