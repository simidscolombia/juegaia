-- ================================================================
-- FUNCIÓN DE ELIMINADO TOTAL (LIMPIEZA COMPLETA)
-- Elimina usuario de Auth (Login) y todos sus datos en App.
-- Solo ejecutable por Super Admin.
-- ================================================================

CREATE OR REPLACE FUNCTION delete_user_full(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 1. SEGURIDAD: Verificar que quien ejecuta es ADMIN
  IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
  ) THEN
      RAISE EXCEPTION 'Acceso denegado. Solo el Super Admin puede destruir cuentas.';
  END IF;

  -- 2. LIMPIEZA DE DATOS (Ordenado para evitar errores de llaves foráneas)
  
  -- Borrar Billetera
  DELETE FROM public.wallets WHERE user_id = target_user_id;
  
  -- Borrar Referidos (Desvincularlos o borrarlos? Mejor desvincular para no borrar gente inocente)
  UPDATE public.profiles SET referred_by = NULL WHERE referred_by = target_user_id;
  
  -- Borrar Tickets comprados por este usuario (en bingos y rifas)
  -- (Nota: Esto podría ser destructivo para el juego, pero si el usuario es "basura", se va todo)
  DELETE FROM public.bingo_players WHERE user_id = target_user_id;
  
  -- Borrar Juegos creados por este usuario (y sus tickets asociados)
  -- Esto es complejo, asumimos borrado en cascada manual de tickets de sus juegos
  -- (Si no hay cascade configured)
  DELETE FROM public.tickets WHERE raffle_id IN (SELECT id FROM public.raffles WHERE owner_id = target_user_id);
  DELETE FROM public.bingo_players WHERE game_id IN (SELECT id FROM public.bingo_games WHERE owner_id = target_user_id);
  
  DELETE FROM public.raffles WHERE owner_id = target_user_id;
  DELETE FROM public.bingo_games WHERE owner_id = target_user_id;

  -- Borrar Perfil
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 3. BORRAR USUARIO DE AUTH (El Login)
  DELETE FROM auth.users WHERE id = target_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
