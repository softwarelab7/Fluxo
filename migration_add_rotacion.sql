-- Add new 'rotacion' column if it doesn't exist
ALTER TABLE productos ADD COLUMN IF NOT EXISTS rotacion TEXT DEFAULT 'media';

-- Migrate existing data only if the old column still exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'is_high_rotation') THEN
        UPDATE productos SET rotacion = 'alta' WHERE is_high_rotation = true;
        UPDATE productos SET rotacion = 'media' WHERE is_high_rotation = false;
        
        -- Drop old column
        ALTER TABLE productos DROP COLUMN is_high_rotation;
    END IF;
END $$;
