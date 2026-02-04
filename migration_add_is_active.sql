-- Add is_active column to proveedores table
ALTER TABLE proveedores
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records to be active
UPDATE proveedores SET is_active = true WHERE is_active IS NULL;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload config';
