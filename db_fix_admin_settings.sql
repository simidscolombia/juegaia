-- FIX: Add INSERT policy for system_settings
-- The previous migration only added UPDATE policy, but 'upsert' requires INSERT permission too.

CREATE POLICY "Admin insert settings" ON system_settings 
FOR INSERT TO authenticated 
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Also, ensure the current user is actually an admin if they haven't set it yet
-- (Optional: You can uncomment and put your email if you are locked out)
-- UPDATE profiles SET role = 'admin' WHERE email = 'tu_email@ejemplo.com';
