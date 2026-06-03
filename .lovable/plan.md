## Resposta direta
Você tem razão, e o seu raciocínio é o correto: quando a credencial é escolhida, ela deve ser **a única** usada — não cair em fallback automático.

Olhei seu processo `7000047-89.2026.8.22.0021` no banco:
- `judit_customer_key = 'alanpjero'` ✅ (foi sim a credencial enviada)
- `capa_completa.secrecy_level = 5`, `parties: []`, `steps: []`
- `capa_completa.crawler.source_name = "JPje - RO - Lawsuit - Auth - 1 instance"`

Ou seja: o import **enviou** a credencial `alanpjero`, mas a Judit não destravou. O motivo é que a credencial `alanpjero` está cadastrada no seu tenant com `system_name = "*"` (genérico), e a Judit, para destravar sigilo em fontes "Auth" como `JPje - RO - Lawsuit - Auth - 1 instance`, costuma exigir credencial vinculada ao **system_name específico daquela fonte**. Você tem duas credenciais com `system_name = "PJE TJRO - 1º grau"` (`TJRO1aALAN` e `pjeteste1`) que são as candidatas reais para destravar.

Isso muda o plano anterior. Em vez de iterar todas, vou: (a) corrigir a regressão de "usar todas" no fluxo de atualizar, (b) deixar o usuário escolher a credencial também no botão "Atualizar processo".

## Causa raiz
1. **`judit-resetar-processo` ignora escolha do usuário.** O reset não aceita `juditCustomerKey` no body; sempre roda o auto-match por sigla do tribunal (pega a primeira `system_name` que contém "tjro"). Para o processo antigo `7002603-…`, isso pegou uma credencial qualquer e voltou sem destravar.
2. **`judit-buscar-processo-cnj` tem fallback agressivo.** Quando o usuário **não** escolhe credencial no dialog, o código pega `credenciais[0]` como último recurso (linha 113) — mandando credencial de outro tribunal, o que vira 401/sigilo silencioso. Quando você escolhe explicitamente, ele respeita; mas a redação confunde porque mistura "auto" e "explícito".
3. **Quando a resposta da Judit destrava** (vem com `parties.length > 0`), o reset **não atualiza** `parte_ativa`, `parte_passiva`, `tribunal`, `tribunal_sigla`, `capa_completa`. Resultado: mesmo destravado, a tela continua "(Processo em sigilo…)".
4. **Não há feedback claro** quando a credencial enviada falha em destravar. O processo só fica com `secrecy_level: 5` no `capa_completa` e o usuário não sabe se foi credencial errada, sem acesso, ou se a Judit não recebeu nada.

## Correção
**A. `supabase/functions/judit-resetar-processo/index.ts`**
- Aceitar no body opcional: `juditCustomerKey` e `juditSystemName` (vindos da UI).
- Se vier `juditCustomerKey`: usar **apenas essa** credencial no `credential.customer_key` do payload. Sem fallback, sem retry com outra credencial.
- Se **não vier**: usar a credencial atualmente salva em `processos_oab.judit_customer_key` (se houver). Sem fallback automático para outras credenciais do tenant. Se não houver nenhuma, manda sem credencial (público).
- Mover a credencial para o shape correto: `search.search_params.credential.customer_key` (idêntico ao import), em vez de `credential.customer_key` no nível raiz — esse foi o shape confirmado por Postman e o que o import usa.
- Quando a resposta trouxer dados (detectar por `responseData.parties.length > 0` **ou** ausência de `secrecy_level` alto), atualizar também:
  - `parte_ativa` ← primeira parte ativa.
  - `parte_passiva` ← primeira parte passiva.
  - `tribunal` ← `responseData.tribunal_acronym` ou `tribunal`.
  - `tribunal_sigla` ← idem.
  - `capa_completa` ← merge da nova capa (remove flag `sigilo`/`secrecy_level` se a resposta veio destravada).
  - `judit_customer_key` ← a credencial que funcionou.
- Quando a resposta vier sigilosa (sem destravar): retornar `{ success: true, destravou: false, motivo: 'credencial_sem_acesso' | 'sem_credencial' }` para a UI mostrar toast claro.

**B. `supabase/functions/judit-buscar-processo-cnj/index.ts`**
- Remover o fallback `customerKey = matched?.customer_key || credenciais[0].customer_key` (linha 113). Se o auto-match não achar credencial daquele tribunal, mandar **sem credencial**, em vez de mandar credencial de tribunal errado (que volta sigilo silenciosamente).
- Não mexer no caminho em que o usuário escolhe explicitamente — esse já está correto.

**C. `src/hooks/useAllProcessosOAB.ts` e UI do botão "Atualizar processo"**
- `resetarProcesso(processoId, numeroCnj, opts?: { juditCustomerKey?, juditSystemName? })`.
- No componente que dispara o reset (lista de processos OAB / drawer do processo), trocar o botão direto por um dropdown / popover pequeno: "Atualizar com…" → lista as credenciais ativas do tenant via `useJuditSystemNames` + opção "Sem credencial (público)" + opção "Usar a última que funcionou" (default, lê do banco).
- Mostrar toast diferenciado quando `destravou === false`: "Credencial não destravou o processo. Tente outra credencial cadastrada ou verifique no painel Judit."

## Arquivos afetados
- `supabase/functions/judit-resetar-processo/index.ts` — aceita credencial explícita, sem fallback, atualiza cabeçalho quando destrava, retorna `destravou`.
- `supabase/functions/judit-buscar-processo-cnj/index.ts` — remove fallback de "primeira credencial qualquer" no auto-match.
- `src/hooks/useAllProcessosOAB.ts` — `resetarProcesso` aceita opções de credencial e propaga toast.
- `src/components/Controladoria/OABTab.tsx` e/ou componente de lista — substituir botão único por menu de escolha de credencial.

Sem migration.

## Impacto
- **UX:** O botão "Atualizar processo" passa a abrir um menu pequeno com a lista das suas credenciais Judit (e a opção "público"). Você escolhe `TJRO1aALAN` ou `pjeteste1` para o processo TJRO sigiloso e tenta destravar com a credencial certa. Se destravar, partes, tribunal, comarca e andamentos aparecem na hora. Se não destravar, toast claro indica isso — não fica mais aquela sensação de "não fez nada".
- **Dados:** Zero migration. Atualizações idempotentes nos mesmos campos de `processos_oab` já existentes. `judit_customer_key` passa a refletir a última credencial usada — útil para auditoria.
- **Riscos colaterais:**
  - Remover o fallback "primeira credencial qualquer" no import vai fazer alguns processos que hoje voltavam **sigilo silencioso** voltarem **sem credencial** (público). Resultado é o mesmo conteúdo, mas com `judit_customer_key = null`, tornando explícito que nenhuma credencial casou. Não há perda de dados.
  - Custo Judit por reset continua igual (1 request por clique) — não estamos mais iterando, então não cresce.
- **Quem é afetado:** Admins/controllers que usam a aba Controladoria → OAB e o botão Atualizar. Processos sigilosos passam a ser realmente destraváveis quando há credencial correta. Processos não sigilosos não mudam.

## Validação
1. Para `7002603-26.2023.8.22.0003` (sigiloso antigo, sem credencial salva): clicar "Atualizar com…" → escolher `TJRO1aALAN`. Esperar polling. Conferir:
   - Resposta destrava (parties != []) → `parte_ativa`, `parte_passiva`, `tribunal_sigla=TJRO`, `capa_completa.city/county` preenchidos, `judit_customer_key='TJRO1aALAN'`.
   - Se não destravar, toast "Credencial não destravou" + processo intacto.
2. Para `7000047-89.2026.8.22.0021` (sigiloso novo, importado com `alanpjero` que não destravou): mesmo fluxo escolhendo `TJRO1aALAN`. Esperado: destrava (ou confirma que essa credencial também não tem acesso, isolando o problema na Judit, não no app).
3. Tentar update sem escolher credencial: usa a `judit_customer_key` atual do processo (ou nenhuma). Não faz auto-match novo.
4. Importar um processo novo de tribunal sem credencial casável e **sem** selecionar nada no dialog: agora vai como público, sem mandar credencial de outro tribunal por engano. Log em `judit_api_logs` deve mostrar payload sem `credential`.
5. Rodar mesmo reset duas vezes seguidas: não duplica andamentos, atualiza `updated_at`.