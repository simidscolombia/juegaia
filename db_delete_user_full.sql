-- ================================================================
-- 1. FUNCIÓN DE ELIMINADO TOTAL (ACTUALIZADA V2 con Transacciones)
-- ================================================================
CREATE OR REPLACE FUNCTION delete_user_full(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Verificar Admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
      RAISE EXCEPTION 'Acceso denegado.';
  END IF;

  -- Borrar Tablas Dependientes
  DELETE FROM public.transactions WHERE user_id = target_user_id;
  DELETE FROM public.commissions WHERE beneficiary_id = target_user_id OR source_user_id = target_user_id;
  DELETE FROM public.wallets WHERE user_id = target_user_id;
  UPDATE public.profiles SET referred_by = NULL WHERE referred_by = target_user_id;
  
  DELETE FROM public.tickets WHERE raffle_id IN (SELECT id FROM public.raffles WHERE owner_id = target_user_id);
  DELETE FROM public.bingo_players WHERE game_id IN (SELECT id FROM public.bingo_games WHERE owner_id = target_user_id);
  DELETE FROM public.bingo_players WHERE user_id = target_user_id;

  DELETE FROM public.raffles WHERE owner_id = target_user_id;
  DELETE FROM public.bingo_games WHERE owner_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Borrar de Auth
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ================================================================
-- 2. LIMPIEZA DE FANTASMAS (MANTENIMIENTO)
-- Ejecuta esto SOLO UNA VEZ para borrar usuarios que eliminaste antes
-- y que quedaron "vivos" en el login pero sin perfil.
-- ================================================================
DELETE FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.profiles)
AND created_at < now() - interval '5 minutes'; 
-- (El intervalo es seguridad por si alguien se está registrando justo ahora)
