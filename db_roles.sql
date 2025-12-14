-- Add role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'player';

-- Create a Policy or just rely on Application Logic for now.
-- Ideally we use RLS, but for the UI hidding, app logic is enough first.

-- INSTRUCTION FOR ADMIN:
-- Replace 'YOUR_EMAIL@gmail.com' with your actual email to become admin.
-- UPDATE profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL@gmail.com';
