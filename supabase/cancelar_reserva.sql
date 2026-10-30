-- UAN Advisor Connect: ejecutar en el SQL Editor de vymgqbozudohwpsdzfjd.
-- No crea tablas/columnas, no borra historial, no desactiva RLS ni concede UPDATE.
-- Función deliberadamente pública para la identificación FUNCIONAL del prototipo.
-- Comprobar los IDs enviados NO autentica al alumno: cualquiera que conozca ambos
-- puede invocarla. No usar este modelo como autorización de producción.
begin;

create or replace function public.cancelar_reserva(
  p_reserva_id bigint,
  p_usuario_id bigint
)
returns setof public.reservas
language plpgsql
security definer
set search_path = ''
as $$
declare
  cita public.reservas%rowtype;
begin
  if p_reserva_id is null or p_usuario_id is null
     or p_reserva_id <= 0 or p_usuario_id <= 0 then
    raise exception 'RESERVA_NO_CANCELABLE' using errcode = 'P0001';
  end if;

  -- Mismo bloqueo por estudiante que el trigger de integridad de reservas.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('reservas_usuario'), p_usuario_id::integer
  );
  select r.* into cita from public.reservas r
    where r.id = p_reserva_id and r.usuario_id = p_usuario_id
    for update;

  if not found then
    raise exception 'RESERVA_NO_CANCELABLE' using errcode = 'P0001';
  end if;
  -- Reintentos seguros tras una respuesta perdida; nunca cancelar otra cita.
  if cita.estado = 'cancelada' then
    return next cita;
    return;
  end if;
  if cita.estado is distinct from 'activa' then
    raise exception 'RESERVA_NO_CANCELABLE' using errcode = 'P0001';
  end if;

  return query update public.reservas r set estado = 'cancelada'
    where r.id = p_reserva_id and r.usuario_id = p_usuario_id
      and r.estado = 'activa'
    returning r.*;
end;
$$;

revoke all on function public.cancelar_reserva(bigint, bigint) from public;
revoke all on function public.cancelar_reserva(bigint, bigint) from anon, authenticated;
grant execute on function public.cancelar_reserva(bigint, bigint) to anon, authenticated;
notify pgrst, 'reload schema';
commit;