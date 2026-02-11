-- ================================================================
-- CREATE RAFFLES TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS public.raffles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES auth.users(id),
    name VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'OPEN', -- OPEN, CLOSED, DRAWN
    
    -- Config
    min_number INTEGER DEFAULT 0,
    max_number INTEGER DEFAULT 99,
    price NUMERIC DEFAULT 10000,
    lottery_name VARCHAR DEFAULT 'Manual',
    digits INTEGER DEFAULT 2, -- 2, 3, 4
    image TEXT, -- URL to image
    
    -- Logistics
    reservation_minutes INTEGER DEFAULT 15,
    draw_date TIMESTAMP WITH TIME ZONE,
    payment_info TEXT,
    
    -- Results
    winner_number INTEGER,
    winner_ticket_id UUID, -- Link to winning ticket if sold
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_raffles_owner ON public.raffles(owner_id);

-- ================================================================
-- CREATE TICKETS TABLE (Unified for Raffles)
-- ================================================================
-- Note: 'bingo_players' is separate for Bingo. 'tickets' is for Raffles.

CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    raffle_id UUID REFERENCES public.raffles(id) ON DELETE CASCADE,
    
    number INTEGER NOT NULL,
    buyer_name VARCHAR,
    phone VARCHAR,
    
    status VARCHAR DEFAULT 'RESERVED', -- RESERVED, PAID, WINNER
    pin VARCHAR, -- For user to claim prize or verify
    
    payment_proof_url TEXT,
    payment_promise_date TIMESTAMP WITH TIME ZONE, -- If reserved
    payment_date TIMESTAMP WITH TIME ZONE, -- When paid
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Constraint: Unique number per raffle
    UNIQUE(raffle_id, number)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_tickets_raffle ON public.tickets(raffle_id);
CREATE INDEX IF NOT EXISTS idx_tickets_phone ON public.tickets(phone);

-- ================================================================
-- RLS POLICIES FOR RAFFLES
-- ================================================================
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;

-- 1. View: Public (Everyone can see raffles)
CREATE POLICY "Public view raffles" ON public.raffles FOR SELECT USING (true);

-- 2. Create: Authenticated Users (Handled by create_game_service, but allow direct if needed)
CREATE POLICY "Users create own raffles" ON public.raffles FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- 3. Update: Owner Only
CREATE POLICY "Owners update own raffles" ON public.raffles FOR UPDATE
USING (auth.uid() = owner_id);

-- 4. Delete: Owner Only (Checked by application logic too)
CREATE POLICY "Owners delete own raffles" ON public.raffles FOR DELETE
USING (auth.uid() = owner_id);

-- ================================================================
-- RLS POLICIES FOR TICKETS
-- ================================================================
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 1. View: Public (To see available numbers)
CREATE POLICY "Public view tickets" ON public.tickets FOR SELECT USING (true);

-- 2. Insert: Public (Anyone can reserve a ticket)
-- Ideally, we might restrict this to authenticated users or use a function.
-- But usually, raffle buyers are anonymous public users.
CREATE POLICY "Public buy tickets" ON public.tickets FOR INSERT 
WITH CHECK (true); 

-- 3. Update: Owner of Raffle (Admin) OR Public User (Upload Proof)
-- This is tricky. Let's allow update if you know the ID (or we use a function).
-- For security, it's better to use a SECURITY DEFINER function for public updates.
-- But for now, let's allow Update if status is RESERVED (e.g. uploading proof)
CREATE POLICY "Public update ticket proof" ON public.tickets FOR UPDATE
USING (status = 'RESERVED'); 

-- 4. Delete: Owner of Raffle Only (Release ticket)
CREATE POLICY "Raffle Owner manage tickets" ON public.tickets FOR DELETE
USING (EXISTS (
    SELECT 1 FROM public.raffles 
    WHERE id = tickets.raffle_id AND owner_id = auth.uid()
));
