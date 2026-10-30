-- UAN Advisor Connect · Reglas de integridad para public.reservas
-- Ejecutar UNA vez en el SQL Editor del proyecto vymgqbozudohwpsdzfjd.
-- No borra ni modifica datos existentes. Reemplaza la versión anterior del trigger.

-- B. Una misma franja no puede tener dos reservas activas.
--    Canceladas y completadas quedan fuera del índice → liberan la franja.
create unique index if not exists reservas_franja_activa_unica
  on public.reservas (franja_id)
  where estado = 'activa';

-- A. Un estudiante no puede tener más de una reserva activa VIGENTE.
--    Solo cuentan las reservas cuya fecha/hora aún no ha pasado (hora de Colombia):
--    una reserva "activa" ya vencida queda como historial y NO bloquea nuevas reservas.
--    Además se rechaza reservar franjas cuya fecha/hora de inicio ya pasó.
--    pg_advisory_xact_lock serializa dos confirmaciones simultáneas del mismo
--    estudiante: la segunda espera y luego ve la primera ya guardada.
create or replace function public.reservas_una_activa_por_usuario()
returns trigger
language plpgsql
as $$
declare
  ahora_fecha date := (now() at time zone 'America/Bogota')::date;
  ahora_hora  time := (now() at time zone 'America/Bogota')::time;
begin
  if new.estado = 'activa'
     and (tg_op = 'INSERT' or old.estado is distinct from 'activa'
          or old.usuario_id is distinct from new.usuario_id) then

    -- No se pueden reservar franjas ya transcurridas.
    if new.fecha < ahora_fecha
       or (new.fecha = ahora_fecha and new.hora_inicio <= ahora_hora) then
      raise exception 'FRANJA_YA_PASO'
        using errcode = 'P0001',
              hint = 'La fecha u hora de la franja ya pasó.';
    end if;

    perform pg_advisory_xact_lock(hashtext('reservas_usuario'), new.usuario_id::int);
    if exists (
      select 1 from public.reservas
      where usuario_id = new.usuario_id
        and estado = 'activa'
        and id is distinct from new.id
        and (fecha > ahora_fecha or (fecha = ahora_fecha and hora_fin > ahora_hora))
    ) then
      raise exception 'ESTUDIANTE_CON_RESERVA_ACTIVA'
        using errcode = 'P0001',
              hint = 'El estudiante ya tiene una reserva activa vigente.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reservas_una_activa_por_usuario on public.reservas;
create trigger trg_reservas_una_activa_por_usuario
  before insert or update of estado, usuario_id on public.reservas
  for each row execute function public.reservas_una_activa_por_usuario();
