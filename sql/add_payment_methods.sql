CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL, -- 'NEQUI', 'DAVIPLATA', 'BANCOLOMBIA', 'EFECTIVO'
  account_number TEXT,
  account_name TEXT,
  instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Allow public (players) to read payment methods
CREATE POLICY "Public Read Payment Methods" ON payment_methods 
FOR SELECT USING (true);

-- Allow admins to manage their own methods
CREATE POLICY "Admin Manage Own Methods" ON payment_methods 
FOR ALL USING (auth.uid() = user_id);

-- Add column to bingo_players if we want to track it
ALTER TABLE bingo_players ADD COLUMN IF NOT EXISTS payment_method_used TEXT;

-- Ensure admin_whatsapp exists on bingo_games
ALTER TABLE bingo_games ADD COLUMN IF NOT EXISTS admin_whatsapp TEXT;
