

# Plano: Criar Card do Daniel com Configuracoes Z-API

## Situacao Atual

A verificacao do banco mostrou:
- **Agente existente**: "Juliana" (role: atendente) - criado manualmente para teste
- **Instancia Z-API existente**: Tem credenciais validas, mas `agent_id = NULL`
- **Problema**: Nao foi criado o agente "Daniel" conforme planejado, e a instancia nao esta vinculada

## Solucao

Executar uma migracao SQL que:

1. Crie o agente "Daniel" (role: admin) no tenant correto
2. Vincule a instancia Z-API existente ao agente Daniel

### Migracao SQL

```sql
-- 1. Criar agente Daniel
INSERT INTO public.whatsapp_agents (tenant_id, name, role, is_active)
VALUES ('d395b3a1-1ea1-4710-bcc1-ff5f6a279750', 'Daniel', 'admin', true)
ON CONFLICT DO NOTHING;

-- 2. Vincular instancia Z-API existente ao Daniel
UPDATE public.whatsapp_instances
SET agent_id = (
  SELECT id FROM public.whatsapp_agents 
  WHERE name = 'Daniel' AND tenant_id = 'd395b3a1-1ea1-4710-bcc1-ff5f6a279750'
  LIMIT 1
)
WHERE tenant_id = 'd395b3a1-1ea1-4710-bcc1-ff5f6a279750'
  AND agent_id IS NULL;
```

## Resultado Esperado

Apos a migracao:
- Card do "Daniel" aparecera na tela de Agentes
- Ao clicar, o drawer mostrara as credenciais Z-API ja preenchidas
- Status de conexao sera exibido corretamente

## Arquivos

Nenhum arquivo de codigo precisa ser alterado - apenas executar a migracao no banco de dados.

