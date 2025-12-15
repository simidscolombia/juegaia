-- ==========================================
-- REPARACIÓN MANUAL DE RED
-- Une a Juliana (o quien sea) con Elkin
-- ==========================================

-- 1. Actualizar el "Jefe" de todos los que están huérfanos
-- (Asigna a Elkin como padre de cualquiera que no tenga padre)
UPDATE public.profiles
SET referred_by = (SELECT id FROM public.profiles WHERE email = 'elkindanielcastillo@gmail.com')
WHERE referred_by IS NULL 
  AND email != 'elkindanielcastillo@gmail.com'; -- Evita que Elkin se refiera a sí mismo

-- 2. Confirmación
SELECT full_name, email, 
       (SELECT full_name FROM profiles p2 WHERE p2.id = profiles.referred_by) as "Nuevo Jefe"
FROM public.profiles
WHERE referred_by IS NOT NULL;
