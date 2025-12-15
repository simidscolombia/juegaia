-- ==========================================
-- DIAGNÓSTICO DE RED MLM
-- Muestra quién invitó a quién y los saldos
-- ==========================================

SELECT 
    p.full_name AS "Usuario",
    p.email AS "Email",
    p.referral_code AS "Su Código",
    -- Mostrar nombre del Jefe
    COALESCE(jefe.full_name, '---') AS "Invitado Por",
    w.balance AS "Saldo",
    -- Contar referidos
    (SELECT count(*) FROM public.profiles sub WHERE sub.referred_by = p.id) AS "Total Referidos"
FROM 
    public.profiles p
LEFT JOIN 
    public.profiles jefe ON p.referred_by = jefe.id
LEFT JOIN
    public.wallets w ON p.id = w.user_id
ORDER BY 
    p.created_at DESC;
