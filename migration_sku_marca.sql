-- INSTRUCCIONES PARA EL USUARIO:
-- 1. Copia todo el contenido de este archivo.
-- 2. Ve a tu panel de Supabase (https://app.supabase.com).
-- 3. Entra a tu proyecto -> SQL Editor (icono de terminal en la izquierda).
-- 4. Pega el código y haz clic en "Run" (Ejecutar).

-- Eliminar la restricción actual de SKU único global
ALTER TABLE productos DROP CONSTRAINT productos_sku_key;

-- Agregar nueva restricción: SKU único solo dentro de la misma marca
ALTER TABLE productos ADD CONSTRAINT productos_sku_marca_key UNIQUE (sku, marca_id);
