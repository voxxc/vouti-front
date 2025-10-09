-- Add material specification fields to metal_ops table
ALTER TABLE metal_ops
ADD COLUMN aco text[],
ADD COLUMN espessura text[],
ADD COLUMN quantidade_material integer;