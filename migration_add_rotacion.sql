-- Add new 'rotacion' column
ALTER TABLE productos ADD COLUMN rotacion TEXT DEFAULT 'media';

-- Migrate existing data
UPDATE productos SET rotacion = 'alta' WHERE is_high_rotation = true;
UPDATE productos SET rotacion = 'media' WHERE is_high_rotation = false;

-- Drop old column
ALTER TABLE productos DROP COLUMN is_high_rotation;
