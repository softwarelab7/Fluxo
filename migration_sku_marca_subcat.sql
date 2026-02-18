-- INSTRUCCIONES:
-- 1. Copia este código.
-- 2. Ve a Supabase -> SQL Editor.
-- 3. Pega y ejecuta.

-- Eliminar la restricción anterior (SKU + Marca)
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_sku_marca_key;

-- Agregar la nueva restricción (SKU + Marca + Subcategoría)
-- Esto permitirá tener el mismo SKU en diferentes marcas o subcategorías.
ALTER TABLE productos ADD CONSTRAINT productos_sku_marca_subcat_key UNIQUE (sku, marca_id, subcategoria_id);
