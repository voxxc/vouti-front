import { CodeBlock } from "./CodeBlock";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const tables = [
  "busca_processos_oab", "client_history", "cliente_dividas", "cliente_documentos",
  "cliente_pagamento_comentarios", "cliente_parcelas", "clientes", "comarcas",
  "controladoria_processos", "deadline_comentarios", "deadline_tags", "deadlines",
  "etiquetas", "grupos_acoes", "lead_comments", "leads_captacao", "link_collections",
  "link_items", "link_profiles", "link_user_roles", "message_attachments", "messages",
  "metal_op_history", "metal_ops", "metal_profiles", "metal_setor_flow", "metal_user_roles",
  "notifications", "processo_andamentos_judit", "processo_atualizacoes_escavador",
  "processo_documentos", "processo_etiquetas", "processo_historico",
  "processo_monitoramento_escavador", "processo_monitoramento_judit",
  "processo_movimentacao_conferencia", "processo_movimentacoes", "processos", "profiles",
  "project_collaborators", "project_columns", "project_sectors", "projects",
  "reuniao_arquivos", "reuniao_cliente_arquivos", "reuniao_cliente_comentarios",
  "reuniao_clientes", "reuniao_comentarios", "reuniao_status", "reunioes",
  "sector_templates", "task_comments", "task_history", "tasks", "tipos_acao",
  "tribunais", "user_roles", "whatsapp_messages"
];

const sqlFunctions = [
  "has_role", "has_metal_role", "has_link_role", "is_tagged_in_deadline",
  "is_deadline_owner", "update_updated_at_column", "handle_new_user",
  "handle_user_deletion", "update_task_updated_at", "update_project_updated_at",
  "auto_update_process_status", "calculate_project_progress",
  "notify_task_assignment", "update_reuniao_progresso", "create_default_acordos_sector",
  "is_project_owner_or_collaborator", "auto_create_metal_profile"
];

export const DatabaseSchemaTab = () => {
  const tableSchema = `-- Exemplo de CREATE TABLE (processos)
CREATE TABLE processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_processo TEXT NOT NULL,
  parte_ativa TEXT NOT NULL,
  parte_passiva TEXT NOT NULL,
  tribunal_id UUID REFERENCES tribunais(id),
  comarca_id UUID REFERENCES comarcas(id),
  tipo_acao_id UUID REFERENCES tipos_acao(id),
  grupo_acao_id UUID REFERENCES grupos_acoes(id),
  advogado_responsavel_id UUID,
  status processo_status DEFAULT 'ativo',
  prioridade processo_prioridade,
  valor_causa NUMERIC,
  valor_condenacao NUMERIC,
  data_distribuicao DATE,
  fase_processual TEXT,
  juizo TEXT,
  link_tribunal TEXT,
  observacoes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE processos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own processos"
  ON processos FOR SELECT
  USING (created_by = auth.uid() OR advogado_responsavel_id = auth.uid());

CREATE POLICY "Admins can manage all processos"
  ON processos FOR ALL
  USING (has_role(auth.uid(), 'admin'));`;

  const rlsPolicies = `-- Row Level Security (RLS) está habilitado em TODAS as tabelas
-- Exemplo de políticas:

-- 1. Usuários podem ver apenas seus próprios dados
CREATE POLICY "users_own_data" ON clientes
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Admins podem ver todos os dados
CREATE POLICY "admins_all_access" ON clientes
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 3. Controllers podem ver mas não modificar
CREATE POLICY "controllers_read_only" ON processos
  FOR SELECT USING (has_role(auth.uid(), 'controller'));

-- Total: ~200+ políticas RLS em 61 tabelas`;

  const functionExample = `-- Função SQL: has_role
CREATE OR REPLACE FUNCTION has_role(user_id UUID, role_name app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = $1
    AND user_roles.role = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função SQL: calculate_project_progress
CREATE OR REPLACE FUNCTION calculate_project_progress(project_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_columns INTEGER;
  task_count INTEGER;
  weighted_sum NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_columns
  FROM project_columns
  WHERE project_columns.project_id = $1;

  IF total_columns = 0 THEN
    RETURN 0;
  END IF;

  SELECT 
    COUNT(*),
    COALESCE(SUM((pc.column_order::NUMERIC / (total_columns - 1)) * 100), 0)
  INTO task_count, weighted_sum
  FROM tasks t
  JOIN project_columns pc ON t.column_id = pc.id
  WHERE pc.project_id = $1;

  IF task_count = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND(weighted_sum / task_count, 2);
END;
$$ LANGUAGE plpgsql;`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Database Overview</CardTitle>
          <CardDescription>
            PostgreSQL com {tables.length} tabelas e {sqlFunctions.length} funções SQL
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold mb-2">📊 Tabelas ({tables.length})</p>
              <div className="flex flex-wrap gap-1">
                {tables.slice(0, 10).map((table) => (
                  <Badge key={table} variant="outline" className="text-xs">
                    {table}
                  </Badge>
                ))}
                <Badge variant="secondary" className="text-xs">+{tables.length - 10} mais</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">⚙️ Funções SQL ({sqlFunctions.length})</p>
              <div className="flex flex-wrap gap-1">
                {sqlFunctions.slice(0, 6).map((func) => (
                  <Badge key={func} variant="outline" className="text-xs">
                    {func}
                  </Badge>
                ))}
                <Badge variant="secondary" className="text-xs">+{sqlFunctions.length - 6} mais</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CodeBlock
        title="Schema SQL - Exemplo (processos)"
        code={tableSchema}
        language="sql"
      />

      <CodeBlock
        title="RLS Policies - Row Level Security"
        code={rlsPolicies}
        language="sql"
      />

      <CodeBlock
        title="SQL Functions - Exemplos"
        code={functionExample}
        language="sql"
      />

      <Card>
        <CardHeader>
          <CardTitle>Todas as Tabelas ({tables.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {tables.map((table) => (
              <code key={table} className="text-xs bg-muted p-2 rounded block">
                {table}
              </code>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
