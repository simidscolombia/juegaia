-- -----------------------------------------------------------------------------
-- MIGRATION: Raffle Payment & Reservation Enhancements
-- -----------------------------------------------------------------------------

-- 1. Update TICKETS table to support Payment Proofs and Promise Dates
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_promise_date TIMESTAMP WITH TIME ZONE;
-- Ensure updated_at exists for expiration logic
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. Update RAFFLES table for Reservation Configuration
ALTER TABLE raffles ADD COLUMN IF NOT EXISTS reservation_minutes INTEGER DEFAULT 15;
ALTER TABLE raffles ADD COLUMN IF NOT EXISTS payment_info TEXT;

-- 3. Storage Bucket Creation (Automated)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('raffle-proofs', 'raffle-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage Policies
-- Allow public access to view images (required for the dashboard link)
CREATE POLICY "Public Read Proofs" ON storage.objects 
FOR SELECT USING (bucket_id = 'raffle-proofs');

-- Allow anyone (or authenticated) to upload proofs
CREATE POLICY "Public Upload Proofs" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'raffle-proofs');
