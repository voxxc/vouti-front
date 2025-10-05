-- Add card_color column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN card_color text DEFAULT 'default';