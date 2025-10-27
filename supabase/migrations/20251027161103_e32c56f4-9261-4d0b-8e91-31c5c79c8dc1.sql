-- Add acordo_details column to tasks table
ALTER TABLE tasks 
ADD COLUMN acordo_details JSONB DEFAULT NULL;

-- Create GIN index for efficient JSON queries
CREATE INDEX idx_tasks_acordo_details ON tasks USING gin (acordo_details);

-- Add comment for documentation
COMMENT ON COLUMN tasks.acordo_details IS 'Detalhes específicos de acordos: contrato, valores, banco, parcelamento, etc.';