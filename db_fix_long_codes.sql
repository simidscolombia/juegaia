-- ==========================================
-- SCRIPT DE MANTENIMIENTO: ARREGLAR CÓDIGOS LARGOS
-- Algunos usuarios quedaron con un código UUID largo (d6ba...).
-- Este script se los recorta a 8 caracteres (o genera uno nuevo).
-- ==========================================

UPDATE public.profiles
SET referral_code = upper(substring(md5(random()::text) from 1 for 8))
WHERE length(referral_code) > 10;

-- Verificar cómo quedaron
SELECT email, referral_code FROM public.profiles;
