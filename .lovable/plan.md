

# Corrigir fresta do drawer e adicionar botão "Abrir em página" no Projetos

## Problema 1: Fresta no topo do drawer
A variante `inset` do sheet tem `top-0 md:top-[57px]` — no desktop, começa 57px abaixo (altura da topbar), deixando a topbar visível. Para cobrir 100% da tela, mudar para `top-0` em todos os breakpoints.

## Problema 2: Botão para abrir /projects no drawer de Projetos
Adicionar um botão no header do ProjectDrawer que navega para a página completa de projetos.

## Alterações

### 1. `src/components/ui/sheet.tsx` (linha 43)
Mudar a variante `inset` de:
```
top-0 md:top-[57px] md:left-[224px] left-0 right-0 bottom-[56px] md:bottom-0
```
Para:
```
top-0 left-0 right-0 bottom-[56px] md:bottom-0
```
Remover `md:top-[57px]` e `md:left-[224px]` para que o drawer cubra toda a tela.

### 2. `src/components/Project/ProjectDrawer.tsx`
Adicionar um botão com ícone `ExternalLink` no header que usa `useTenantNavigation` para navegar para `/projects`, fechando o drawer ao clicar.

