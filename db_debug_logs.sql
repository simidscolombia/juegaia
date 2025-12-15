-- ==========================================
-- LOGS DE DINERO (Últimos Movimientos)
-- ==========================================

SELECT '--- TRANSACCIONES (RECARGAS) ---' as table_name;
SELECT 
    created_at, 
    amount, 
    status, 
    reference,
    (SELECT email FROM profiles WHERE id = user_id) as user_email
FROM transactions 
ORDER BY created_at DESC 
LIMIT 5;

SELECT '--- COMISIONES GENERADAS ---' as table_name;
SELECT 
    created_at, 
    amount, 
    percentage, 
    level,
    (SELECT email FROM profiles WHERE id = beneficiary_id) as "Beneficiario (Jefe)",
    (SELECT email FROM profiles WHERE id = source_user_id) as "Fuente (Subdito)"
FROM commissions 
ORDER BY created_at DESC 
LIMIT 5;
