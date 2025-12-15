-- ==========================================
-- SCRIPT DE EMERGENCIA: AGREGAR COLUMNAS FALTANTES
-- La tabla 'profiles' no tenía 'phone' ni 'document_id',
-- por eso el Trigger fallaba al intentar guardar esos datos.
-- ==========================================

-- 1. Agregar columna Teléfono
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone VARCHAR;

-- 2. Agregar columna Cédula/Documento
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS document_id VARCHAR;

-- 3. Agregar columna Referral Code (por si acaso no corrió el pasado)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR UNIQUE;

-- 4. Asegurarse que el Super Admin tenga permisos completos
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
