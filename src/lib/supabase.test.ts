import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelarReserva, reservaVigente, type Reserva } from "./supabase";

const cita: Reserva = { id: 101, usuario_id: 7, recurso_id: 2, franja_id: 15,
  fecha: "2099-11-01", hora_inicio: "10:00:00", hora_fin: "11:00:00",
  estado: "activa", creada_en: "2026-10-30T00:00:00Z" };
const respuesta = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => vi.unstubAllGlobals());

describe("Cancelación asociada al estudiante", () => {
  it("no solicita cancelar una reserva que no está asociada al estudiante elegido", async () => {
    const fetch = vi.fn().mockResolvedValue(respuesta([]));
    vi.stubGlobal("fetch", fetch);
    await expect(cancelarReserva(101, 8)).rejects.toMatchObject({ motivo: "no_asociada" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toContain("usuario_id=eq.8");
  });

  it("envía ambos IDs y solo confirma éxito al leer estado cancelada en Supabase", async () => {
    const cancelada = { ...cita, estado: "cancelada" };
    const fetch = vi.fn().mockResolvedValueOnce(respuesta([cita]))
      .mockResolvedValueOnce(respuesta([cancelada])).mockResolvedValueOnce(respuesta([cancelada]));
    vi.stubGlobal("fetch", fetch);
    expect(await cancelarReserva(101, 7)).toEqual(cancelada);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetch.mock.calls[1]?.[1]?.body)).toEqual({ p_reserva_id: 101, p_usuario_id: 7 });
  });

  it("no confirma cancelación si la lectura sigue mostrando activa", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(respuesta([cita]))
      .mockResolvedValueOnce(respuesta([])).mockResolvedValueOnce(respuesta([cita]));
    vi.stubGlobal("fetch", fetch);
    await expect(cancelarReserva(101, 7)).rejects.toMatchObject({ motivo: "no_verificada" });
  });

  it("no cancela reservas completadas", async () => {
    const fetch = vi.fn().mockResolvedValue(respuesta([{ ...cita, estado: "completada" }]));
    vi.stubGlobal("fetch", fetch);
    await expect(cancelarReserva(101, 7)).rejects.toMatchObject({ motivo: "no_activa" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("permite reintentar una cancelación ya almacenada sin cancelar otra reserva", async () => {
    const cancelada = { ...cita, estado: "cancelada" };
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(respuesta([cancelada])));
    vi.stubGlobal("fetch", fetch);
    expect(await cancelarReserva(101, 7)).toEqual(cancelada);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.every((call) => !call[1]?.method)).toBe(true);
  });

  it("informa que la cancelación necesita habilitarse si no existe la función", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(respuesta([cita]))
      .mockResolvedValueOnce(respuesta({ code: "PGRST202", message: "Function not found" }, 404));
    vi.stubGlobal("fetch", fetch);
    await expect(cancelarReserva(101, 7)).rejects.toMatchObject({ motivo: "no_habilitada" });
  });
});

it("las activas vencidas no bloquean y las vigentes sí, usando hora de Colombia", () => {
  const ahora = { fecha: "2026-10-30", hora: "12:00:00" };
  expect(reservaVigente({ fecha: "2026-10-30", hora_fin: "12:00:00" }, ahora)).toBe(false);
  expect(reservaVigente({ fecha: "2026-10-30", hora_fin: "12:01:00" }, ahora)).toBe(true);
});