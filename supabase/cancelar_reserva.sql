-- UAN Advisor Connect · Cancelación de reservas por el propio estudiante
-- Ejecutar UNA vez en el SQL Editor del proyecto vymgqbozudohwpsdzfjd.
-- No crea tablas ni columnas. Solo agrega una función segura.
--
-- La clave pública no tiene permiso de UPDATE sobre public.reservas (RLS).
-- Esta función permite cambiar ÚNICAMENTE el estado de 'activa' a 'cancelada',
-- y solo si la reserva pertenece al estudiante indicado. No permite modificar
-- ningún otro campo ni reservas de otros estudiantes.
-- Nota: es identificación funcional del prototipo, no autenticación real.

create or replace function public.cancelar_reserva(p_reserva_id bigint, p_usuario_id bigint)
returns public.reservas
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.reservas;
begin
  select * into r from public.reservas where id = p_reserva_id for update;

  if not found then
    raise exception 'RESERVA_NO_EXISTE' using errcode = 'P0001';
  end if;
  if r.usuario_id <> p_usuario_id then
    raise exception 'RESERVA_NO_PERTENECE' using errcode = 'P0001';
  end if;
  if r.estado <> 'activa' then
    raise exception 'RESERVA_NO_ACTIVA' using errcode = 'P0001';
  end if;

  update public.reservas set estado = 'cancelada' where id = p_reserva_id
  returning * into r;
  return r;
end;
$$;

revoke all on function public.cancelar_reserva(bigint, bigint) from public;
grant execute on function public.cancelar_reserva(bigint, bigint) to anon, authenticated;
