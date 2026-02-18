-- Add 'Agotado' to the check constraint for pedido_items status
ALTER TABLE pedido_items DROP CONSTRAINT IF EXISTS pedido_items_estado_item_check;
ALTER TABLE pedido_items ADD CONSTRAINT pedido_items_estado_item_check 
CHECK (estado_item IN ('Completo', 'Incompleto', 'No llegó', 'Dañado', 'Cancelado', 'Pendiente', 'Agotado'));
