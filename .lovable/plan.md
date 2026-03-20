
# Fix: sincronizar códigos TOTP entre todos os usuários

## Entendimento do problema

Hoje os códigos são gerados no frontend com `Date.now()` em `src/lib/totp.ts`. Isso faz cada navegador usar o próprio relógio local para calcular o TOTP. Se o relógio de um usuário estiver alguns segundos adiantado/atrasado, ele entra em outra janela de 30s e vê um código diferente do restante.

Ou seja: o problema não é mais a visibilidade dos tokens, e sim a base de tempo usada para gerar os códigos.

## O que precisa mudar

### 1. Parar de usar o relógio local como fonte principal
- Ajustar `src/lib/totp.ts` para aceitar um timestamp de referência:
  - `generateTOTP(secret, timestampMs?)`
  - `getSecondsRemaining(timestampMs?)`
- Assim o cálculo deixa de depender obrigatoriamente de `Date.now()`.

### 2. Criar sincronização de relógio do cliente com o servidor
- Criar um hook/utilitário para obter um “offset” entre o relógio do navegador e o horário do servidor/Supabase.
- Fluxo:
  - buscar horário do servidor ao abrir o `TOTPSheet`
  - calcular `serverOffsetMs = serverNow - clientNow`
  - usar sempre `Date.now() + serverOffsetMs` para gerar código e contador
  - recalibrar periodicamente e quando o drawer for reaberto

## 3. Aplicar isso no `TOTPSheet`
- Trocar toda a lógica atual para gerar os códigos com o timestamp sincronizado:
  - estado local de `serverOffsetMs`
  - `secondsRemaining` calculado com o horário sincronizado
  - `generateAllCodes()` usando o mesmo horário base para todos os tokens naquele ciclo
- Melhorar a regeneração:
  - em vez de depender de `secondsRemaining === 30`, regenerar quando o “time step” mudar
  - isso evita perder a virada por atraso do `setInterval`

### 4. Garantir experiência consistente na UI
- Enquanto sincroniza o relógio pela primeira vez, mostrar loading curto ou manter os códigos bloqueados por um instante
- Se a sincronização falhar, pode cair em fallback local, mas com aviso discreto de que a hora pode estar dessincronizada

## Arquivos principais

| Arquivo | Mudança |
|---|---|
| `src/lib/totp.ts` | Aceitar timestamp externo no cálculo |
| `src/components/Dashboard/TOTPSheet.tsx` | Usar hora sincronizada do servidor em vez de `Date.now()` |
| `src/hooks/` ou `src/lib/` | Novo hook/utilitário de sincronização de relógio |

## Resultado esperado

- Todos os usuários com acesso à mesma carteira verão o mesmo código ao mesmo tempo
- O contador de expiração ficará alinhado entre usuários
- Reduz drasticamente o problema de “o código já está inválido quando o outro tenta usar”

## Detalhe técnico
A correção não exige mudar o secret nem o algoritmo TOTP. O algoritmo já está correto; o que precisa ser unificado é a referência de tempo. TOTP é determinístico: mesmo `secret` + mesma janela de tempo = mesmo código para todos.
