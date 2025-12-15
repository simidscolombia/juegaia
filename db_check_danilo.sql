-- DIAGNÓSTICO PRECISO
-- Buscamos por el correo real que vimos en pantalla: "dspos"

SELECT 
    p.full_name AS "Nombre", 
    p.email AS "Email", 
    p.referred_by AS "ID Jefe",
    (SELECT full_name FROM profiles p2 WHERE p2.id = p.referred_by) as "Nombre Jefe"
FROM public.profiles p
WHERE p.email LIKE '%dspos%';
