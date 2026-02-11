

## Rebranding: Z-API para Vouti.API (textos visiveis ao usuario)

Substituir todas as referencias textuais "Z-API" por "Vouti.API" nos componentes do frontend. Nomes de variaveis, campos do banco de dados e Edge Functions permanecem inalterados (sao tecnicos e nao visiveis ao usuario).

### Arquivos a alterar

| Arquivo | Mudancas |
|---|---|
| `src/components/WhatsApp/settings/AgentConfigDrawer.tsx` | "Credenciais Z-API" → "Credenciais Vouti.API", "painel Z-API" → "painel Vouti.API", placeholder da URL |
| `src/components/SuperAdmin/WhatsApp/SuperAdminAgentConfigDrawer.tsx` | Mesmas mudancas do AgentConfigDrawer (versao Super Admin) |
| `src/components/SuperAdmin/WhatsApp/SuperAdminAgentsSettings.tsx` | "Conexao Z-API" → "Conexao Vouti.API", "Credenciais Z-API" → "Credenciais Vouti.API", "configuracoes Z-API" → "configuracoes Vouti.API", textos de toast, placeholder, descricoes |
| `src/components/CRM/WhatsAppBot.tsx` | "Conectando com Z-API..." → "Conectando com Vouti.API...", "Falha ao conectar com Z-API" → "Falha ao conectar com Vouti.API", comentarios visiveis |
| `src/components/Backend/EdgeFunctionsTab.tsx` | "Salva configuracao Z-API" → "Salva configuracao Vouti.API", "Conecta com WhatsApp via Z-API" → "Conecta com WhatsApp via Vouti.API" |
| `src/components/Backend/SecretsTab.tsx` | "URL da instancia Z-API" → "URL da instancia Vouti.API", "ID da instancia Z-API" → "ID da instancia Vouti.API", "Token Z-API" → "Token Vouti.API", comentario "# Z-API WhatsApp" → "# Vouti.API WhatsApp" |
| `src/utils/zapiHelpers.ts` | Comentarios: "URLs Z-API" → "URLs Vouti.API" (somente documentacao) |

### O que NAO muda

- Nomes de variaveis (`zapi_instance_id`, `zapi_client_token`, etc.)
- Nomes de tabelas/colunas do banco (`zapi_instance_id`, `zapi_token`, etc.)
- Edge Functions (`whatsapp-zapi-action`, `save-zapi-config`, etc.)
- URLs reais da API (`https://api.z-api.io/...`)
- Secrets (`Z_API_URL`, `Z_API_INSTANCE_ID`, `Z_API_TOKEN`)

Apenas textos que o usuario ve na interface serao renomeados para "Vouti.API".

