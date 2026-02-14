-- Add 'Agotado' to the ENUM type estado_item
ALTER TYPE estado_item ADD VALUE IF NOT EXISTS 'Agotado';

-- Just in case Cancelado is missing from the ENUM (based on the error)
ALTER TYPE estado_item ADD VALUE IF NOT EXISTS 'Cancelado';

-- Remove the check constraint if it was added incorrectly
ALTER TABLE pedido_items DROP CONSTRAINT IF EXISTS pedido_items_estado_item_check;
