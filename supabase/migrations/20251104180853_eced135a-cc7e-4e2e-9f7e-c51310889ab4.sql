-- Create RLS policies for reunioes table to include agenda role
CREATE POLICY "Agenda can view all reunioes"
  ON public.reunioes
  FOR SELECT
  USING (has_role(auth.uid(), 'agenda'::app_role));

CREATE POLICY "Agenda can create reunioes"
  ON public.reunioes
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'agenda'::app_role));

CREATE POLICY "Agenda can update reunioes"
  ON public.reunioes
  FOR UPDATE
  USING (has_role(auth.uid(), 'agenda'::app_role));

CREATE POLICY "Agenda can delete reunioes"
  ON public.reunioes
  FOR DELETE
  USING (has_role(auth.uid(), 'agenda'::app_role));

-- Create RLS policies for reuniao_comentarios table
CREATE POLICY "Agenda can view all comentarios"
  ON public.reuniao_comentarios
  FOR SELECT
  USING (has_role(auth.uid(), 'agenda'::app_role));

CREATE POLICY "Agenda can create comentarios"
  ON public.reuniao_comentarios
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'agenda'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Agenda can update their comentarios"
  ON public.reuniao_comentarios
  FOR UPDATE
  USING (has_role(auth.uid(), 'agenda'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Agenda can delete their comentarios"
  ON public.reuniao_comentarios
  FOR DELETE
  USING (has_role(auth.uid(), 'agenda'::app_role) AND auth.uid() = user_id);