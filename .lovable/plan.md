

## Plano: Mover aba "Geral" para dentro do OABManager

### O que muda

A aba "Geral" sai do nível superior da Controladoria e passa a ser a **primeira sub-aba dentro de OABs**, antes das abas individuais de cada OAB (ex: Geral | 12345/SP | 67890/RJ).

### Mudanças

#### 1. `src/components/Controladoria/OABManager.tsx`
- Adicionar um botão "Geral" como primeira aba nas sub-tabs (antes das OABs individuais), usando um valor especial como `'geral'`
- Quando `activeTab === 'geral'`, renderizar `<GeralTab />` no conteúdo
- Definir `'geral'` como valor padrão do `activeTab` (ao invés da primeira OAB)

#### 2. `src/components/Controladoria/ControladoriaContent.tsx`
- Remover `'geral'` do `TabValue` de nível superior
- Remover a renderização do `<GeralTab />` nesse nível
- Remover o import do `GeralTab`

#### 3. `src/components/Controladoria/GeralTab.tsx`
- Sem alterações — continua funcionando como está

