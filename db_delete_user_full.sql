-- ================================================================
-- 1. FUNCIÓN DE ELIMINADO TOTAL (ACTUALIZADA V3)
-- ================================================================
CREATE OR REPLACE FUNCTION delete_user_full(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Verificar Admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
      RAISE EXCEPTION 'Acceso denegado.';
  END IF;

  -- 1. LIMPIEZA PROFUNDA DE DEPENDENCIAS
  DELETE FROM public.transactions WHERE user_id = target_user_id;
  DELETE FROM public.commissions WHERE beneficiary_id = target_user_id OR source_user_id = target_user_id;
  DELETE FROM public.wallets WHERE user_id = target_user_id;
  
  DELETE FROM public.tickets WHERE raffle_id IN (SELECT id FROM public.raffles WHERE owner_id = target_user_id);
  DELETE FROM public.bingo_players WHERE game_id IN (SELECT id FROM public.bingo_games WHERE owner_id = target_user_id);
  DELETE FROM public.bingo_players WHERE user_id = target_user_id;

  DELETE FROM public.raffles WHERE owner_id = target_user_id;
  DELETE FROM public.bingo_games WHERE owner_id = target_user_id;
  
  UPDATE public.profiles SET referred_by = NULL WHERE referred_by = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 2. Borrar de Auth
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ================================================================
-- 2. LIMPIEZA DE FANTASMAS (SOLUCIÓN DEFINITIVA)
-- Este bloque borra todo rastro de usuarios que perdieron su perfil
-- ordenadamente para evitar el error de "transactions key".
-- ================================================================
DO $$
DECLARE
    orphan_id UUID;
BEGIN
    -- Iterar sobre cada usuario en Auth que NO tiene Perfil (Fantasmas)
    FOR orphan_id IN 
        SELECT id FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles)
    LOOP
        -- Borrar dependencias del fantasma
        DELETE FROM public.transactions WHERE user_id = orphan_id;
        DELETE FROM public.commissions WHERE beneficiary_id = orphan_id OR source_user_id = orphan_id;
        DELETE FROM public.wallets WHERE user_id = orphan_id;
        DELETE FROM public.bingo_players WHERE user_id = orphan_id;
        
        -- Finalmente borrar el usuario
        DELETE FROM auth.users WHERE id = orphan_id;
    END LOOP;
END $$;
