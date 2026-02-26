

## Adicionar Editar e Apagar campanha

### Mudanças em `src/components/WhatsApp/sections/WhatsAppCampaigns.tsx`

**1. Novo state para edição**
- `editingCampaign: Campaign | null` — quando set, abre o dialog em modo edição
- Reutilizar o mesmo dialog (isOpen) para criar e editar

**2. Função `handleEdit(campaign)`**
- Preenche o form com os dados da campanha (name, messageTemplate, selectedAgentId, selectedColumnId, batchSize, intervalMinutes)
- Seta `editingCampaign` e abre o dialog

**3. Função `handleUpdate()`**
- Atualiza `whatsapp_campaigns` com os campos editáveis: `name`, `message_template`, `batch_size`, `interval_minutes`
- Não permite trocar agente/coluna (pois as mensagens já foram geradas para aqueles contatos)
- Toast de sucesso e reload

**4. Função `handleDelete(campaign)`**
- Confirmação via `AlertDialog`
- Deleta `whatsapp_campaign_messages` onde `campaign_id = id`
- Deleta `whatsapp_campaigns` onde `id = id`
- Toast e reload

**5. UI — botões na card de cada campanha**
- Adicionar ícones `Pencil` e `Trash2` ao lado do play/pause
- `Pencil` chama `handleEdit`
- `Trash2` abre AlertDialog de confirmação

**6. Dialog title dinâmico**
- Se `editingCampaign`: título "Editar Campanha", botão "Salvar Alterações"
- Se não: título "Criar Campanha", botão "Criar e Iniciar Campanha"
- Agente e Coluna ficam disabled em modo edição

### Imports adicionais
- `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger` de `@/components/ui/alert-dialog`
- `Pencil, Trash2` de `lucide-react`

