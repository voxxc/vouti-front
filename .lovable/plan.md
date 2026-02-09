
# Plano: Atualizar Status de Conexao do Daniel

## Problema Identificado

A consulta ao banco mostrou:
- **Agent ID**: `80a953f6-73e1-4985-9717-ec73e1c40c1b`
- **connection_status**: `disconnected` (incorreto)

O servico Z-API esta funcional (envia/recebe mensagens), mas o campo `connection_status` na tabela `whatsapp_instances` esta desatualizado.

## Solucao

Executar um UPDATE simples para corrigir o status:

```sql
UPDATE public.whatsapp_instances
SET connection_status = 'connected'
WHERE agent_id = '80a953f6-73e1-4985-9717-ec73e1c40c1b';
```

## Resultado

Apos a correcao:
- Card do Daniel mostrara **bolinha verde** + texto "Conectado"
- Status refletira a realidade operacional

## Arquivos

Nenhuma alteracao de codigo necessaria - apenas atualizacao de dado no banco.
