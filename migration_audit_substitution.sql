-- Add producto_real_id to pedido_items to track substitutions
ALTER TABLE pedido_items 
ADD COLUMN producto_real_id UUID REFERENCES productos(id);

-- Optional: Add comment
COMMENT ON COLUMN pedido_items.producto_real_id IS 'Reference to the actual product received if different from ordered (Substitution)';
