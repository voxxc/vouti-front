-- Add rotation column to metal_ops table
ALTER TABLE metal_ops 
ADD COLUMN ficha_tecnica_rotation integer NOT NULL DEFAULT 0;