import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "./CodeBlock";
import { Badge } from "@/components/ui/badge";

interface DatabaseSchemaTabProps {
  searchQuery: string;
}

const sampleTables = [
  {
    name: "processos",
    description: "Processos judiciais",
    columns: 28,
    createStatement: `CREATE TABLE public.processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_processo TEXT NOT NULL,
  parte_ativa TEXT NOT NULL,
  parte_passiva TEXT NOT NULL,
  tribunal_nome TEXT,
  comarca_nome TEXT,
  status processo_status DEFAULT 'ativo',
  prioridade processo_prioridade DEFAULT 'media',
  created_by UUID NOT NULL,
  advogado_responsavel_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT processos_numero_processo_unique UNIQUE (numero_processo)
);

-- Enable RLS
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own processos"
  ON public.processos FOR SELECT
  USING (created_by = auth.uid() OR advogado_responsavel_id = auth.uid());

CREATE POLICY "Users can create their own processos"
  ON public.processos FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage all processos"
  ON public.processos FOR ALL
  USING (has_role(auth.uid(), 'admin'));`
  },
  {
    name: "clientes",
    description: "Clientes do CRM",
    columns: 24,
    createStatement: `CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome_pessoa_fisica TEXT,
  nome_pessoa_juridica TEXT,
  cpf VARCHAR,
  cnpj VARCHAR,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  uf TEXT,
  data_nascimento DATE,
  data_fechamento DATE NOT NULL,
  valor_contrato NUMERIC NOT NULL,
  forma_pagamento TEXT NOT NULL,
  status_cliente TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own clients"
  ON public.clientes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients"
  ON public.clientes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all clients"
  ON public.clientes FOR ALL
  USING (has_role(auth.uid(), 'admin'));`
  },
  {
    name: "deadlines",
    description: "Prazos e compromissos",
    columns: 10,
    createStatement: `CREATE TABLE public.deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  advogado_responsavel_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their deadlines"
  ON public.deadlines FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() = advogado_responsavel_id OR 
    is_tagged_in_deadline(id, auth.uid())
  );

CREATE POLICY "Users can create their own deadlines"
  ON public.deadlines FOR INSERT
  WITH CHECK (auth.uid() = user_id);`
  }
];

const sampleFunctions = [
  {
    name: "has_role",
    description: "Verifica se usuário tem determinada role",
    code: `CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;`
  },
  {
    name: "update_updated_at_column",
    description: "Trigger para atualizar campo updated_at automaticamente",
    code: `CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;`
  },
  {
    name: "gerar_parcelas_cliente",
    description: "Gera parcelas automaticamente ao criar cliente",
    code: `CREATE OR REPLACE FUNCTION public.gerar_parcelas_cliente()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  parcela_num INTEGER := 0;
  data_vencimento DATE;
BEGIN
  DELETE FROM public.cliente_parcelas WHERE cliente_id = NEW.id;
  
  IF NEW.forma_pagamento = 'parcelado' AND NEW.numero_parcelas > 0 THEN
    FOR i IN 1..NEW.numero_parcelas LOOP
      INSERT INTO public.cliente_parcelas (
        cliente_id,
        numero_parcela,
        valor_parcela,
        data_vencimento,
        status
      ) VALUES (
        NEW.id,
        i,
        NEW.valor_parcela,
        (NEW.data_fechamento + (i - 1) * INTERVAL '1 month')::DATE,
        CASE
          WHEN (NEW.data_fechamento + (i - 1) * INTERVAL '1 month')::DATE < CURRENT_DATE 
          THEN 'atrasado'
          ELSE 'pendente'
        END
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;`
  }
];

export function DatabaseSchemaTab({ searchQuery }: DatabaseSchemaTabProps) {
  const filteredTables = sampleTables.filter(table =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    table.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFunctions = sampleFunctions.filter(func =>
    func.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    func.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Tabs defaultValue="tables">
      <TabsList>
        <TabsTrigger value="tables">Tabelas (61)</TabsTrigger>
        <TabsTrigger value="functions">Funções SQL (17)</TabsTrigger>
        <TabsTrigger value="policies">RLS Policies</TabsTrigger>
      </TabsList>

      <TabsContent value="tables" className="space-y-4 mt-4">
        {filteredTables.map((table) => (
          <Card key={table.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-mono">{table.name}</CardTitle>
                  <CardDescription>{table.description}</CardDescription>
                </div>
                <Badge variant="secondary">{table.columns} colunas</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={table.createStatement}
                language="sql"
                title={`CREATE TABLE ${table.name}`}
              />
            </CardContent>
          </Card>
        ))}

        {filteredTables.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma tabela encontrada para "{searchQuery}"
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="functions" className="space-y-4 mt-4">
        {filteredFunctions.map((func) => (
          <Card key={func.name}>
            <CardHeader>
              <CardTitle className="font-mono">{func.name}()</CardTitle>
              <CardDescription>{func.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={func.code}
                language="sql"
                title={`CREATE FUNCTION ${func.name}`}
              />
            </CardContent>
          </Card>
        ))}

        {filteredFunctions.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma função encontrada para "{searchQuery}"
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="policies" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Row Level Security (RLS) Policies</CardTitle>
            <CardDescription>
              Políticas de segurança em nível de linha para controle de acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CodeBlock
              code={`-- Exemplo: Políticas RLS para tabela processos
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own processos"
  ON public.processos FOR SELECT
  USING (created_by = auth.uid() OR advogado_responsavel_id = auth.uid());

CREATE POLICY "Users can create their own processos"
  ON public.processos FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own processos"
  ON public.processos FOR UPDATE
  USING (created_by = auth.uid() OR advogado_responsavel_id = auth.uid());

CREATE POLICY "Admins can manage all processos"
  ON public.processos FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Políticas para clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients"
  ON public.clientes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all clients"
  ON public.clientes FOR ALL
  USING (has_role(auth.uid(), 'admin'));`}
              language="sql"
              title="RLS Policies (Exemplo)"
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
