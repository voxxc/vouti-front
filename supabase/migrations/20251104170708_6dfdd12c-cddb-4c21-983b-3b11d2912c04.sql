-- Permitir que todos os usuários autenticados vejam todas as reuniões
DROP POLICY IF EXISTS "Authenticated users can view all reunioes" ON reunioes;
CREATE POLICY "Authenticated users can view all reunioes" 
  ON reunioes FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Permitir que todos vejam todos os comentários de reuniões
DROP POLICY IF EXISTS "Authenticated users can view all reuniao comentarios" ON reuniao_comentarios;
CREATE POLICY "Authenticated users can view all reuniao comentarios" 
  ON reuniao_comentarios FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Permitir que todos criem comentários em qualquer reunião
DROP POLICY IF EXISTS "Authenticated users can create reuniao comentarios" ON reuniao_comentarios;
CREATE POLICY "Authenticated users can create reuniao comentarios" 
  ON reuniao_comentarios FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM reunioes WHERE id = reuniao_comentarios.reuniao_id)
  );