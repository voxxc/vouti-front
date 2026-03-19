

# Fix: Notificação de etapa detectada como protocolo (prioridade errada no parser)

## Problema

A função `getCommentMentionTarget` verifica palavras-chave em ordem, e **'protocolo' vem antes de 'etapa'**. Porém, o conteúdo das notificações de etapa inclui contexto hierárquico como "• Protocolo: testes • Projeto: ...", o que faz a função retornar `'protocolo'` em vez de `'etapa'`.

Resultado: o clique tenta abrir um protocolo usando o ID da etapa → falha silenciosa.

## Solução

Reordenar as verificações em `getCommentMentionTarget` para que `'etapa'` seja verificado **antes** de `'protocolo'`. Etapa é mais específica (está contida dentro de um protocolo), então deve ter prioridade.

### Arquivo: `NotificationCenter.tsx`

Mudar a ordem das linhas 87-89 de:
```
if (text.includes('protocolo')) return 'protocolo';
if (text.includes('prazo')) return 'deadline';
if (text.includes('etapa')) return 'etapa';
```

Para:
```
if (text.includes('etapa')) return 'etapa';
if (text.includes('protocolo')) return 'protocolo';
if (text.includes('prazo')) return 'deadline';
```

Uma mudança de 2 linhas.

