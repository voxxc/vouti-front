## Problema

Na aba **Controladoria > Geral**, a busca só encontra processos quando o CNJ é digitado com a pontuação (`0000134-75.2024.8.16.0192`). Se o usuário digita só os 20 dígitos (`00001347520248160192`), nada aparece — porque o campo `numero_cnj` no banco está armazenado **com** a pontuação, e o `ilike` compara texto literal.

## Solução

Ajustar `src/hooks/useAllProcessosOAB.ts` para detectar quando o termo digitado é uma sequência de 20 dígitos (CNJ sem máscara) e, nesse caso, formatá-lo automaticamente para o padrão CNJ antes de fazer a query no Supabase.

A busca formatada continua usando `ilike`, então o usuário pode colar:
- `00001347520248160192` → convertido para `0000134-75.2024.8.16.0192`
- `0000134-75.2024.8.16.0192` → usado como está
- partes do número, nome de parte, tribunal → comportamento atual mantido

### Detalhes técnicos

No bloco de search server-side (linha ~47):

```ts
if (searchTerm.trim()) {
  const raw = searchTerm.trim();
  const digits = raw.replace(/\D/g, '');
  let cnjVariant = raw;

  // Se o usuário digitou exatamente 20 dígitos, formatar como CNJ
  if (/^\d{20}$/.test(digits)) {
    cnjVariant = `${digits.slice(0,7)}-${digits.slice(7,9)}.${digits.slice(9,13)}.${digits.slice(13,14)}.${digits.slice(14,16)}.${digits.slice(16,20)}`;
  }

  const termoRaw = `%${raw}%`;
  const termoCnj = `%${cnjVariant}%`;

  query = query.or(
    `numero_cnj.ilike.${termoCnj},numero_cnj.ilike.${termoRaw},parte_ativa.ilike.${termoRaw},parte_passiva.ilike.${termoRaw},tribunal_sigla.ilike.${termoRaw}`
  );
}
```

Extrair também a formatação para um helper reutilizável em `src/utils/processoHelpers.ts` (`formatCnjFromDigits`) para manter consistência.

## Arquivos alterados

- `src/utils/processoHelpers.ts` — novo helper `formatCnjFromDigits`.
- `src/hooks/useAllProcessosOAB.ts` — usar o helper na construção do filtro.

## Fora de escopo

- Não muda o input visual nem força máscara — usuário pode digitar com ou sem pontuação.
- Não altera busca de CNPJ / OAB / Push-docs (pode ser estendido depois se quiser).
