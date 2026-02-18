
UPDATE whatsapp_conversation_kanban wck
SET column_id = topo.id
FROM whatsapp_kanban_columns transferidos,
     whatsapp_kanban_columns topo
WHERE wck.column_id = transferidos.id
  AND transferidos.name = 'Transferidos'
  AND topo.agent_id = transferidos.agent_id
  AND topo.name = 'Topo de Funil'
  AND wck.transferred_from_agent_id IS NULL;
