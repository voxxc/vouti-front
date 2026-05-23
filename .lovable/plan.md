## Causa raiz
O badge "notification dot" no canto -top/-right ficou visualmente pesado e desalinhado com a grade de abas, criando um ponto vermelho destacado que destoa do tom minimalista do drawer.

## Correção
Reposicionar o contador como um pequeno badge **centralizado no topo da célula da aba**, com visual suave:

- Posição: `absolute top-0.5 left-1/2 -translate-x-1/2` (centro horizontal, colado no topo)
- Forma: pílula arredondada (`rounded-full`), altura ~14px, padding horizontal mínimo
- Cor: tom suave usando tokens semânticos — fundo `bg-destructive/10` com texto `text-destructive` (em vez do vermelho sólido `bg-destructive`)
- Tipografia: `text-[9px] font-medium leading-none`
- Sem sombra, sem `animate-pulse` na variante padrão (manter pulse apenas em intimações urgentes, mas também em tom suave)
- Texto da aba ganha `pt-2.5` para abrir espaço ao badge sem sobrepor
- Mantém `99+` como teto

Resultado: badge discreto, alinhado ao topo do label, integrado ao ritmo visual da TabsList.

## Arquivos afetados
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — apenas os TabsTrigger de "Andamentos" e "Intimações"

## Impacto
1. **UX**: contador fica visualmente mais leve e centralizado, sem "engolir" o label nem competir com outros elementos do drawer. Leitura mais rápida e elegante.
2. **Dados**: nenhum impacto — mudança puramente visual em 1 arquivo.
3. **Riscos colaterais**: nenhum; não altera lógica de contagem (`andamentosNaoLidos`, `intimacoesUrgentes`, `intimacoesNaoLidas`), apenas reposiciona/restiliza.
4. **Quem é afetado**: todos os usuários que abrem o drawer de detalhes de processo (advogados, controllers, admin) em qualquer tenant.

## Validação
- Abrir um processo com andamentos não lidos e verificar badge centralizado no topo da aba.
- Verificar com contadores de 1, 2 e 3 dígitos (testar `99+`).
- Confirmar que o label "Andamentos" / "Intimações" não é mais truncado prematuramente.
- Verificar light e dark mode (cores via tokens HSL).
