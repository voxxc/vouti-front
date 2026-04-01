
-- Create the security hotfixes table
CREATE TABLE public.super_admin_security_hotfixes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','info')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done')),
  category text,
  affected_resource text,
  identified_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.super_admin_security_hotfixes ENABLE ROW LEVEL SECURITY;

-- Only super admins can access
CREATE POLICY "Super admins full access" ON public.super_admin_security_hotfixes
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Seed initial hotfixes
INSERT INTO public.super_admin_security_hotfixes (title, description, severity, status, category, affected_resource) VALUES
('password_reset_codes sem RLS', 'A tabela password_reset_codes não possui Row Level Security ativado. Códigos de reset de senha e emails dos usuários ficam acessíveis publicamente via API, permitindo que qualquer pessoa consulte ou manipule tokens de redefinição de senha.', 'critical', 'pending', 'rls', 'password_reset_codes'),
('Storage: processo-documentos cross-tenant', 'O bucket processo-documentos permite que qualquer usuário autenticado leia documentos jurídicos de qualquer tenant. Não há verificação de tenant_id nas policies de storage, expondo documentos sigilosos entre escritórios.', 'critical', 'pending', 'storage', 'processo-documentos'),
('Storage: comprovantes-pagamento cross-tenant', 'O bucket comprovantes-pagamento permite leitura cross-tenant. Comprovantes de pagamento de clientes de um escritório podem ser acessados por usuários de outro escritório autenticado.', 'critical', 'pending', 'storage', 'comprovantes-pagamento'),
('Storage: financial-documents cross-tenant', 'O bucket financial-documents permite leitura cross-tenant. Documentos financeiros sensíveis (custos, relatórios) ficam acessíveis a qualquer usuário autenticado independente do tenant.', 'critical', 'pending', 'storage', 'financial-documents'),
('Storage: reuniao-attachments público', 'O bucket reuniao-attachments está configurado como público. Arquivos anexados em reuniões (atas, documentos) podem ser acessados por qualquer pessoa sem autenticação.', 'critical', 'pending', 'storage', 'reuniao-attachments'),
('batink_profiles sem autenticação', 'A tabela batink_profiles possui RLS desabilitado ou políticas permissivas. Perfis de funcionários do sistema de ponto (BatInk) ficam legíveis sem autenticação, expondo dados pessoais.', 'critical', 'pending', 'rls', 'batink_profiles'),
('Edge Function sem auth: judit-cofre-credenciais', 'A Edge Function judit-cofre-credenciais aceita requisições com CPF e senha de tribunais sem validar o JWT do usuário chamador. Qualquer pessoa com a URL pode enviar credenciais ou consultar dados sensíveis.', 'high', 'pending', 'edge_function', 'judit-cofre-credenciais'),
('Edge Function sem auth: save-zapi-config', 'A Edge Function save-zapi-config aceita tokens de API do WhatsApp (Z-API) sem validar JWT. Um atacante pode sobrescrever configurações de integração WhatsApp de qualquer tenant.', 'high', 'pending', 'edge_function', 'save-zapi-config'),
('Storage: task-attachments cross-tenant', 'O bucket task-attachments permite que colaboradores de qualquer projeto acessem anexos de tarefas de outros projetos/tenants. Falta verificação de tenant_id nas policies.', 'high', 'pending', 'storage', 'task-attachments'),
('dangerouslySetInnerHTML sem sanitização', 'Os componentes StraightToPointView.tsx e SectionViewer.tsx utilizam dangerouslySetInnerHTML para renderizar HTML vindo do banco de dados sem passar por DOMPurify. Isso permite ataques XSS se conteúdo malicioso for inserido no banco.', 'medium', 'pending', 'xss', 'StraightToPointView.tsx, SectionViewer.tsx'),
('Realtime channels sem RLS', 'Qualquer usuário autenticado pode assinar canais Realtime de qualquer tenant. Não há verificação de tenant_id nos filtros de canal, permitindo espionagem de atualizações em tempo real de outros escritórios.', 'medium', 'pending', 'realtime', 'Realtime subscriptions'),
('Storage: planejador-chat-files público', 'O bucket planejador-chat-files está acessível sem autenticação. Arquivos compartilhados no chat interno do planejador podem ser acessados por qualquer pessoa com a URL direta.', 'medium', 'pending', 'storage', 'planejador-chat-files'),
('batink_user_roles sem autenticação', 'A tabela batink_user_roles está acessível sem autenticação adequada. Roles de administrador do sistema BatInk ficam visíveis, permitindo mapeamento de contas privilegiadas.', 'medium', 'pending', 'auth', 'batink_user_roles'),
('Tabelas com RLS sem políticas definidas', 'Algumas tabelas possuem RLS habilitado porém sem nenhuma política definida. Isso bloqueia todo acesso (comportamento seguro), mas pode indicar tabelas esquecidas que deveriam ter políticas configuradas.', 'info', 'pending', 'rls', 'Várias tabelas'),
('Leaked password protection desabilitada', 'A proteção contra senhas vazadas (HaveIBeenPwned) está desabilitada nas configurações do Supabase Auth. Usuários podem cadastrar senhas que já foram comprometidas em vazamentos conhecidos.', 'info', 'pending', 'auth', 'Supabase Auth config');
