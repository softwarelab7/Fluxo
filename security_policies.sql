-- Enable RLS on all tables
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;

-- 1. Categorias
CREATE POLICY "Enable all access for authenticated users" ON categorias
FOR ALL USING (auth.role() = 'authenticated');

-- 2. Proveedores
CREATE POLICY "Enable all access for authenticated users" ON proveedores
FOR ALL USING (auth.role() = 'authenticated');

-- 3. Marcas
CREATE POLICY "Enable all access for authenticated users" ON marcas
FOR ALL USING (auth.role() = 'authenticated');

-- 4. Productos
CREATE POLICY "Enable all access for authenticated users" ON productos
FOR ALL USING (auth.role() = 'authenticated');

-- 5. Pedidos
CREATE POLICY "Enable all access for authenticated users" ON pedidos
FOR ALL USING (auth.role() = 'authenticated');

-- 6. Pedido Items
CREATE POLICY "Enable all access for authenticated users" ON pedido_items
FOR ALL USING (auth.role() = 'authenticated');
