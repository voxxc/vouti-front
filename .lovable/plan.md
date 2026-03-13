

# Reconfiguração da Busca Geral (Dados Cadastrais) conforme Documentação Judit

## Problema
A edge function `judit-buscar-dados-cadastrais` usa o endpoint errado (`https://requests.prod.judit.io/requests`) e **não envia `response_type: "entity"`**, que é o campo obrigatório para consultas de dados cadastrais segundo a documentação oficial.

## Correções conforme docs.judit.io

### 1. Edge Function `supabase/functions/judit-buscar-dados-cadastrais/index.ts`

**Endpoint**: Trocar de `https://requests.prod.judit.io/requests` para `https://lawsuits.prod.judit.io/requests/create`

**Payload**: Adicionar `response_type: "entity"` obrigatório no objeto `search`:
```json
{
  "search": {
    "search_type": "cpf",
    "search_key": "999.999.999-99",
    "response_type": "entity"
  }
}
```

**Opcionais conforme doc**:
- `on_demand: true` — consulta em tempo real na Receita Federal (já existe, manter)
- `reveal_partners_documents: true` — para CNPJ, revelar docs dos sócios (já existe, manter)

**Polling**: O endpoint de polling (`/responses`) provavelmente também muda para `https://lawsuits.prod.judit.io/...` — verificar e ajustar. Manter a mesma lógica de retry.

**Enriquecimento por nome**: A chamada interna `fetchEntityDetails` também precisa usar o endpoint correto com `response_type: "entity"`.

### 2. Frontend `src/components/SuperAdmin/SuperAdminBuscaGeral.tsx`

**Normalizar mapeamento dos campos da resposta** conforme o formato documentado:
- `entity_type` → "person" ou "company" (já parcialmente mapeado, alinhar)
- `main_document` → documento principal
- `contacts[].contact_type` + `contacts[].description` (doc usa `description` e `contact_type`, frontend espera `value` e `type`)
- `parents[].name` + `parents[].kinship` → filiação (mãe/pai)
- `partners[].position` → qualificação do sócio (frontend usa `qualification`)
- `branch_activities` → atividades econômicas (frontend usa `economic_activities`)
- `social_name` → nome fantasia (frontend usa `trading_name`)
- `legal_nature.name` → natureza jurídica (frontend usa string)
- `special_status` → situação especial
- `revenue_service_active` → status na Receita
- `birth_date`, `gender`, `nationality` — já mapeados
- `tags.revenue_update_date` — data de atualização na Receita (novo campo a exibir)
- `head_office` — se é matriz (novo campo a exibir para CNPJ)
- `size` — porte da empresa (novo)
- `share_capital` — capital social (já existe)
- `aka_names` — nomes alternativos (novo campo a exibir)

A normalização será feita na edge function (transformar resposta Judit → formato padronizado) para manter o frontend limpo.

### Arquivos a modificar
- `supabase/functions/judit-buscar-dados-cadastrais/index.ts` — endpoint, payload, normalização
- `src/components/SuperAdmin/SuperAdminBuscaGeral.tsx` — interfaces e rendering alinhados ao formato real da API

