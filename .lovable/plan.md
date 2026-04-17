

## Objetivo

Adicionar uma seção fixa **"Impacto"** em todo plano de revisão, explicando claramente o que vai mudar para o usuário (UX, dados, performance, comportamento) após a aplicação. Isso torna cada plano mais completo e ajuda na decisão de aprovar.

## Estrutura nova dos planos

Daqui pra frente, todo plano que eu apresentar vai seguir este formato:

1. **Causa raiz** — o porquê do bug ou a justificativa da feature
2. **Correção / Implementação** — o que vou mudar tecnicamente
3. **Arquivos afetados** — lista dos arquivos
4. **Impacto** *(NOVO)* — o que vai acontecer na prática:
   - O que muda para o usuário final (UX, telas, fluxos)
   - O que muda nos dados (migrations, RLS, performance)
   - Riscos colaterais (algo que pode quebrar, algo que muda comportamento sutilmente)
   - Quem é afetado (admin, advogado, todos os tenants, só um tenant, etc.)
5. **Validação** — passos pra você conferir que funcionou

## Exemplo prático

Pra ilustrar, se fosse o último plano (filtro de usuário no Planejador), a seção Impacto ficaria:

> **Impacto**
> - **Admins** ganham visão completa: ao trocar usuário no dropdown, veem tasks e prazos do colega selecionado nas duas abas (Colunas e Prazos).
> - **Advogados comuns** continuam restritos pelo RLS — selecionar outro usuário só mostra o que já têm permissão de ver (compartilhados/participantes).
> - **Aba Prazos** muda comportamento: hoje mostra só do logado, depois respeita o filtro. Se admin esquecer no "Todos", vai ver todos os prazos do tenant — útil mas pode causar visual mais carregado.
> - **Sem migration** nem mudança de dados — mudança puramente frontend.
> - **Risco baixo**: nenhum endpoint novo, RLS já protege contra acesso indevido.

## Onde isso fica registrado

Vou salvar essa preferência em memória (`mem://~user`) pra aplicar automaticamente em todos os planos futuros, em qualquer projeto seu. Sem precisar lembrar de pedir de novo.

## Arquivos afetados

- `mem://~user` — adicionar regra: "Em todo plano de revisão, incluir seção 'Impacto' explicando consequências práticas (UX, dados, riscos, quem é afetado)."

## Validação

No próximo plano que eu apresentar (qualquer mudança que você pedir), confira que tem a seção **Impacto** com os 4 pontos: usuário final, dados, riscos, quem é afetado.

