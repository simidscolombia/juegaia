-- ==========================================================
-- SCRIPT: CREAR BUCKET DE IMAGENES (PUBLIC-ASSETS)
-- ==========================================================

-- 1. Crear el Bucket "public-assets" (Si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Eliminar políticas antiguas para evitar duplicados/errores
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;

-- 3. Política: Todo el mundo puede VER las imágenes (Lectura Pública)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'public-assets' );

-- 4. Política: Solo usuarios logueados pueden SUBIR imágenes
CREATE POLICY "Authenticated Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'public-assets' );

-- (Opcional) Permitir borrar también a usuarios logueados (para botón quitar)
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'public-assets' );

RAISE NOTICE 'Bucket public-assets configurado correctamente.';
