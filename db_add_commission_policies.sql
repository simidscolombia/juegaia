-- ==========================================
-- MLM SECURITY: COMMISSION VISIBILITY
-- ==========================================

-- 1. Enable Row Level Security (RLS) on Commissions
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- 2. Policy: "Beneficiaries can view their earnings"
-- Permite al usuario ver las comisiones donde él es el beneficiario (dueño del dinero)
CREATE POLICY "Users can view their commissions" ON commissions
    FOR SELECT
    USING (auth.uid() = beneficiary_id);

-- 3. Policy: "Super Admin can view all"
-- (Optional but useful for debugging from frontend if admin logs in)
CREATE POLICY "Admins can view all commissions" ON commissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Grant access to authenticated users
GRANT SELECT ON commissions TO authenticated;
