// Conexión directa al proyecto Supabase de la universidad (solo clave publicable).
const SUPABASE_URL = "https://vymgqbozudohwpsdzfjd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GecI-T7rSyzbn1yGh4GSrQ_JfHXnrYG";
const REST = `${SUPABASE_URL}/rest/v1`;

// La clave publicable (formato sb_publishable_*) no es un JWT: se envía solo en
// la cabecera `apikey`, nunca como `Authorization: Bearer`.
const baseHeaders = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  "Content-Type": "application/json",
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${REST}${path}`, {
    ...init,
    headers: { ...baseHeaders, ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `Error ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

export type Usuario = {
  id: number;
  nombre: string;
  codigo: string;
  programa: string | null;
  correo: string | null;
};

export type Recurso = {
  id: number;
  nombre: string;
  tipo: string;
  ubicacion: string | null;
  capacidad: number | null;
  atributos: string | null;
  activo: number | null;
};

export type Franja = {
  id: number;
  recurso_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
};

export type Reserva = {
  id: number;
  franja_id: number;
  recurso_id: number;
  usuario_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  creada_en: string;
};

export const TIPOS_ASESORIA = ["Orientación psicosocial", "Lectura y redacción"] as const;

// Fecha y hora actuales en Colombia (America/Bogota), sin depender de la zona del navegador.
export function ahoraEnColombia(): { fecha: string; hora: string } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const hora = get("hour") === "24" ? "00" : get("hour");
  return {
    fecha: `${get("year")}-${get("month")}-${get("day")}`,
    hora: `${hora}:${get("minute")}:${get("second")}`,
  };
}

// Una reserva "activa" solo bloquea si todavía está vigente (su fecha/hora no ha pasado).
// Las activas ya vencidas quedan como historial y no impiden una nueva reserva.
export function reservaVigente(
  r: Pick<Reserva, "fecha" | "hora_fin">,
  ahora: { fecha: string; hora: string } = ahoraEnColombia(),
) {
  return r.fecha > ahora.fecha || (r.fecha === ahora.fecha && r.hora_fin > ahora.hora);
}

export class ReservaError extends Error {
  constructor(
    public motivo: "franja_ocupada" | "estudiante_con_reserva" | "franja_pasada" | "otro",
    message: string,
  ) {
    super(message);
  }
}

export function buscarUsuarioPorCodigo(codigo: string) {
  return request<Usuario[]>(
    `/usuarios?select=id,nombre,codigo,programa,correo&codigo=eq.${encodeURIComponent(codigo.trim())}&limit=1`,
  ).then((rows) => rows[0] ?? null);
}

export function listarUsuarios() {
  return request<Usuario[]>(`/usuarios?select=id,nombre,codigo,programa,correo&order=nombre.asc`);
}

// Devuelve la reserva activa VIGENTE del estudiante (si existe). Las reservas
// activas cuya fecha/hora ya pasó se consideran historial y no bloquean.
export function reservaActivaDeUsuario(usuarioId: number) {
  const ahora = ahoraEnColombia();
  return request<Reserva[]>(
    `/reservas?select=*&estado=eq.activa&usuario_id=eq.${usuarioId}&fecha=gte.${ahora.fecha}&order=fecha.asc`,
  ).then((rows) => rows.find((r) => reservaVigente(r, ahora)) ?? null);
}

export function obtenerRecurso(id: number) {
  return request<Recurso[]>(`/recursos?select=*&id=eq.${id}&limit=1`).then((r) => r[0] ?? null);
}

export function listarRecursosPorTipo(tipo: string) {
  return request<Recurso[]>(
    `/recursos?select=*&activo=eq.1&tipo=eq.${encodeURIComponent(tipo)}&order=nombre.asc`,
  );
}

export function listarFranjas(recursoIds: number[], desde: string) {
  if (recursoIds.length === 0) return Promise.resolve([] as Franja[]);
  return request<Franja[]>(
    `/franjas?select=*&recurso_id=in.(${recursoIds.join(",")})&fecha=gte.${desde}` +
      `&order=fecha.asc&order=hora_inicio.asc`,
  );
}

export function listarReservasActivas(franjaIds: number[]) {
  if (franjaIds.length === 0) return Promise.resolve([] as Reserva[]);
  return request<Reserva[]>(
    `/reservas?select=id,franja_id,estado&estado=eq.activa&franja_id=in.(${franjaIds.join(",")})`,
  );
}

export function franjaEstaOcupada(franjaId: number) {
  return request<{ id: number }[]>(
    `/reservas?select=id&estado=eq.activa&franja_id=eq.${franjaId}&limit=1`,
  ).then((rows) => rows.length > 0);
}

export class CancelacionError extends Error {
  constructor(
    public motivo: "no_habilitada" | "no_pertenece" | "no_activa" | "otro",
    message: string,
  ) {
    super(message);
  }
}

// Cancela una reserva del estudiante mediante la función SQL `cancelar_reserva`,
// que verifica en la base de datos que la reserva sea suya y siga activa.
export async function cancelarReserva(reservaId: number, usuarioId: number): Promise<Reserva> {
  const res = await fetch(`${REST}/rpc/cancelar_reserva`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ p_reserva_id: reservaId, p_usuario_id: usuarioId }),
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = String(body?.message ?? "");
    if (body?.code === "PGRST202") throw new CancelacionError("no_habilitada", msg);
    if (msg.includes("RESERVA_NO_PERTENECE") || msg.includes("RESERVA_NO_EXISTE"))
      throw new CancelacionError("no_pertenece", msg);
    if (msg.includes("RESERVA_NO_ACTIVA")) throw new CancelacionError("no_activa", msg);
    throw new CancelacionError("otro", msg || `Error ${res.status}`);
  }
  const r = (Array.isArray(body) ? body[0] : body) as Reserva | null;
  if (!r || r.estado !== "cancelada")
    throw new CancelacionError("otro", "No se confirmó la cancelación.");
  return r;
}

// `id` y `creada_en` ahora los genera la base de datos automáticamente.
export async function crearReserva(input: {
  franja: Franja;
  usuarioId: number;
}): Promise<Reserva> {
  // Validación también al guardar: no se pueden reservar franjas ya transcurridas.
  const ahora = ahoraEnColombia();
  if (
    input.franja.fecha < ahora.fecha ||
    (input.franja.fecha === ahora.fecha && input.franja.hora_inicio <= ahora.hora)
  ) {
    throw new ReservaError("franja_pasada", "La fecha u hora de la franja ya pasó.");
  }
  const res = await fetch(`${REST}/reservas`, {
    method: "POST",
    headers: { ...baseHeaders, Prefer: "return=representation" },
    body: JSON.stringify({
      franja_id: input.franja.id,
      recurso_id: input.franja.recurso_id,
      usuario_id: input.usuarioId,
      fecha: input.franja.fecha,
      hora_inicio: input.franja.hora_inicio,
      hora_fin: input.franja.hora_fin,
      estado: "activa",
    }),
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = String(body?.message ?? "");
    // Errores lanzados por las reglas de integridad en PostgreSQL.
    if (body?.code === "23505" || msg.includes("FRANJA_OCUPADA"))
      throw new ReservaError("franja_ocupada", msg);
    if (msg.includes("ESTUDIANTE_CON_RESERVA_ACTIVA"))
      throw new ReservaError("estudiante_con_reserva", msg);
    if (msg.includes("FRANJA_YA_PASO")) throw new ReservaError("franja_pasada", msg);
    throw new ReservaError("otro", msg || `Error ${res.status}`);
  }
  const creada = (body as Reserva[])[0];
  if (!creada) throw new ReservaError("otro", "No se pudo crear la reserva.");
  return creada;
}
