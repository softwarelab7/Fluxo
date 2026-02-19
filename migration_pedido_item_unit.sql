-- Migración para agregar el campo de unidad (Unidad/Paquete) a los ítems del pedido
ALTER TABLE pedido_items ADD COLUMN unidad TEXT DEFAULT 'Unidad' CHECK (unidad IN ('Unidad', 'Paquete'));
