-- Habilitar Realtime para a tabela processos
ALTER TABLE public.processos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.processos;

-- Políticas de RLS para DELETE
CREATE POLICY "Admins can delete all processos"
ON public.processos
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Controllers can delete all processos"
ON public.processos
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'controller'::app_role));

CREATE POLICY "Users can delete their own processos"
ON public.processos
FOR DELETE
TO authenticated
USING ((auth.uid() = created_by) OR (auth.uid() = advogado_responsavel_id));