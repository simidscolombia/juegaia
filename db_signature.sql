-- Function to generate Wompi Integrity Signature
-- Formula: SHA256(Reference + AmountInCents + Currency + IntegritySecret)

CREATE OR REPLACE FUNCTION get_wompi_signature(
    p_reference VARCHAR,
    p_amount_in_cents BIGINT -- Using BIGINT for cents to avoid overflow
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_secret VARCHAR := 'prod_integrity_Rgdu1fQJAxE6LJrjgDIOcWLTBO1fNzwY'; -- HARDCODED SECRET
    v_currency VARCHAR := 'COP';
    v_string_to_sign TEXT;
    v_hash TEXT;
BEGIN
    -- Concatenate string: Reference + AmountInCents + Currency + Secret
    v_string_to_sign := p_reference || p_amount_in_cents::TEXT || v_currency || v_secret;
    
    -- Generate SHA256 Hash
    v_hash := encode(digest(v_string_to_sign, 'sha256'), 'hex');
    
    RETURN v_hash;
END;
$$;
