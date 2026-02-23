

## Renomear "Time/Times" para "Departamento/Departamentos" no Vouti.CRM

Trocar todas as referencias visuais (labels, placeholders, toasts, titulos) de "Time/Times" para "Departamento/Departamentos". A tabela do banco (`whatsapp_teams`) e as variaveis internas (`teamId`, `teams`, etc.) permanecem iguais -- apenas o texto exibido ao usuario muda.

### Arquivos a alterar

| Arquivo | Mudancas |
|---|---|
| `src/components/WhatsApp/settings/WhatsAppTeamsSettings.tsx` | Titulo "Times" -> "Departamentos", descricao "times de atendimento" -> "departamentos de atendimento", toasts ("Time criado" -> "Departamento criado", etc.), placeholders, card title "Times Cadastrados" -> "Departamentos Cadastrados", "Nenhum time" -> "Nenhum departamento", "Novo Time" -> "Novo Departamento", "Nome do Time" -> "Nome do Departamento" |
| `src/components/WhatsApp/WhatsAppSidebar.tsx` | Menu label `"Times"` -> `"Departamentos"`, sub-menu label "Times" -> "Departamentos", "Nenhum time" -> "Nenhum departamento" |
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppSidebar.tsx` | Settings menu label `"Times"` -> `"Departamentos"` |
| `src/components/WhatsApp/settings/AddAgentDialog.tsx` | Label "Time (opcional)" -> "Departamento (opcional)", placeholder "Nenhum time" -> "Nenhum departamento" |

### Detalhes tecnicos

- Nenhuma mudanca em tabelas, colunas ou variaveis de codigo -- apenas strings de UI
- O ID da secao no menu (`"teams"`) permanece o mesmo para evitar quebras de roteamento
- A tabela `whatsapp_teams` continua com o mesmo nome no banco de dados
