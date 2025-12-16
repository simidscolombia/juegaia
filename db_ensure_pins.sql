
-- =============================================
-- UNIFIED PIN SETUP SCRIPT (BINGO + RAFFLE)
-- =============================================

-- 1. RAFFLES (tickets table)
-- ---------------------------------------------
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'pin') THEN 
        ALTER TABLE tickets ADD COLUMN pin VARCHAR(10);
    END IF; 
END $$;

-- Enable Index for Raffles
CREATE INDEX IF NOT EXISTS idx_tickets_pin ON tickets(pin);

-- Backfill Raffles (If any existing tickets have no PIN) -> Random 4 digit
UPDATE tickets 
SET pin = floor(random() * (9999-1000+1) + 1000)::text
WHERE pin IS NULL;


-- 2. BINGO (bingo_players table)
-- ---------------------------------------------
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bingo_players' AND column_name = 'pin') THEN 
        ALTER TABLE bingo_players ADD COLUMN pin VARCHAR(10);
    END IF; 
    
    -- Also ensure phone and user_id exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bingo_players' AND column_name = 'phone') THEN 
        ALTER TABLE bingo_players ADD COLUMN phone VARCHAR;
    END IF;
END $$;

-- Enable Index for Bingo
CREATE INDEX IF NOT EXISTS idx_bingo_players_pin ON bingo_players(pin);
CREATE INDEX IF NOT EXISTS idx_bingo_players_phone ON bingo_players(phone);

-- Backfill Bingo (If need PIN)
UPDATE bingo_players 
SET pin = floor(random() * (9999-1000+1) + 1000)::text
WHERE pin IS NULL;


-- 3. CONFIRMATION
SELECT 'PIN Setup Complete for BOTH Bingo and Raffle.' as status;
