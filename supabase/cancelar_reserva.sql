-- UAN Advisor Connect · Cancelación de reservas por el propio estudiante
-- Ejecutar UNA vez en el SQL Editor del proyecto vymgqbozudohwpsdzfjd.
-- No crea tablas ni columnas. Solo cambia 'activa' -> 'cancelada' y únicamente
-- si la reserva pertenece al estudiante indicado (identificación funcional del prototipo).
-- Al quedar 'cancelada', sale del índice reservas_franja_activa_unica y la franja se libera.

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

  update public.reservas set estado = 'cancelada' where id = p_reserva_id returning * into r;
  return r;
end;
$$;

revoke all on function public.cancelar_reserva(bigint, bigint) from public;
grant execute on function public.cancelar_reserva(bigint, bigint) to anon, authenticated;
