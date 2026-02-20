-- Añadir campo 'es_nueva' a la tabla pedido_items si no existe
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS es_nueva BOOLEAN DEFAULT FALSE;

-- Actualizar comentarios para documentación
COMMENT ON COLUMN pedido_items.es_nueva IS 'Indica si la referencia SKU es nueva o no se ha pedido anteriormente';
