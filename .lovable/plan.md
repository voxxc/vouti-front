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
