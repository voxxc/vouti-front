-- Fix: Remove incorrectly linked processo_oab_id from deadline that was created via protocolo
-- The protocolo itself has no processo_oab_id, so the link was inherited from __currentProcessoOabId (bug)
UPDATE public.deadlines 
SET processo_oab_id = NULL 
WHERE id = '2d6520cc-06a8-431c-be31-45367aa186a3';