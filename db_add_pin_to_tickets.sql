-- Add PIN column to tickets table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'pin') THEN 
        ALTER TABLE tickets ADD COLUMN pin VARCHAR(10);
    END IF; 
END $$;

-- Backfill existing tickets with a random 4 digit PIN
UPDATE tickets 
SET pin = floor(random() * (9999-1000+1) + 1000)::text
WHERE pin IS NULL;

-- Add index for fast lookup
CREATE INDEX IF NOT EXISTS idx_tickets_pin ON tickets(pin);
